import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
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
import { startAlertCron } from './jobs/alertCron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/camps', campsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/monthly-records', monthlyRecordsRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/occupancy', occupancyRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start contract expiry alert cron job
startAlertCron();

app.listen(PORT, () => {
  console.log(`🚀 Bartawi CMS API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Connected to PostgreSQL`);
});
