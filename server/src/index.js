import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './lib/logger.js';
import { requireAuth } from './middleware/auth.js';

// Route imports
import authRouter from './routes/auth.js';
import healthRoutes from './routes/health.js';
import usersRouter from './routes/users.js';
import campsRouter from './routes/camps.js';
import roomsRouter from './routes/rooms.js';
import paymentsRouter from './routes/payments.js';
import monthlyRecordsRouter from './routes/monthlyRecords.js';
import complaintsRouter from './routes/complaints.js';
import contractsRouter from './routes/contracts.js';
import occupancyRouter from './routes/occupancy.js';
import expensesRouter from './routes/expenses.js';
import reportsRouter from './routes/reports.js';
import notificationsRouter from './routes/notifications.js';
import propertyTypesRouter from './routes/propertyTypes.js';
import depositsRouter from './routes/deposits.js';
import paymentSchedulesRouter from './routes/paymentSchedules.js';
import teamsRouter from './routes/teams.js';
import maintenanceRouter from './routes/maintenance.js';
import aiRouter from './routes/ai.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import tenantRouter from './routes/tenant.js';
import featureFlagsRouter from './routes/featureFlags.js';

// Jobs
import { startAlertCron } from './jobs/alertCron.js';
import { startPartitionCron } from './jobs/partitionCron.js';
import { startBillingCron } from './jobs/billingCron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Fail fast on missing critical env vars
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in .env');
  process.exit(1);
}

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet — security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // relax for dev; tighten in prod
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and explicitly allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body size limit (prevents huge-payload DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// LOGGING MIDDLEWARE
// ============================================================

app.use(pinoHttp({
  logger,
  customProps: (req) => ({
    userId: req.user?.id,
    tenantId: req.tenantId,
  }),
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  }
}));

// ============================================================
// RATE LIMITING
// ============================================================

// Generic rate limiter — 200 req/min per IP (increased for dashboard with multiple simultaneous queries)
const genericLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
app.use('/api/', genericLimiter);

// Strict limiter for auth endpoints — 5 req/min per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } },
});
app.use('/api/v1/auth/login', authLimiter);

// ============================================================
// HEALTH ENDPOINTS (NO AUTH)
// ============================================================

app.use(healthRoutes);  // exposes GET /healthz and /readyz

// ============================================================
// API ROUTES — v1
// ============================================================

// Auth routes (no auth required)
app.use('/api/v1/auth', authRouter);

// Global auth requirement for all other /api/v1/* routes
app.use('/api/v1', requireAuth);

// Protected routes (all require authentication + permissions)
app.use('/api/v1/occupancy', occupancyRouter);
app.use('/api/v1/contracts', contractsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/notifications', notificationsRouter);

// Additional routes (future-ready)
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/camps', campsRouter);
app.use('/api/v1/rooms', roomsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/monthly-records', monthlyRecordsRouter);
app.use('/api/v1/complaints', complaintsRouter);
app.use('/api/v1/expenses', expensesRouter);

// New routes from Backend Additions
app.use('/api/v1/property-types', propertyTypesRouter);
app.use('/api/v1/deposits', depositsRouter);
app.use('/api/v1/payment-schedules', paymentSchedulesRouter);
app.use('/api/v1/teams', teamsRouter);
app.use('/api/v1/maintenance', maintenanceRouter);

// Gap-fix routes
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/roles', rolesRouter);
app.use('/api/v1/permissions', permissionsRouter);
app.use('/api/v1/tenant', tenantRouter);
app.use('/api/v1/feature-flags', featureFlagsRouter);

// ============================================================
// ERROR HANDLERS
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL',
      message: err.message || 'Internal server error'
    }
  });
});

// ============================================================
// CRON JOBS
// ============================================================

// Start contract expiry alert cron job
startAlertCron();

// Start partition maintenance cron job
startPartitionCron();

// Start billing cron job
startBillingCron();

// ============================================================
// SERVER START & GRACEFUL SHUTDOWN
// ============================================================

const server = app.listen(PORT, () => {
  logger.info(`🚀 Bartawi CMS API running on http://localhost:${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🗄️  Database: Connected to PostgreSQL`);
});

async function shutdown(signal) {
  logger.info(`[${signal}] Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Shutdown error');
      process.exit(1);
    }
  });
  // Force-exit after 10s if shutdown hangs
  setTimeout(() => {
    logger.error('Forced exit after 10s');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
