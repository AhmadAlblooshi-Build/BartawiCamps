import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const GRACE_DAYS = 5;

/**
 * Generate billed monthly_records from scheduled payments
 * Runs on 1st of each month
 */
async function generateBilledRecordsForTenant(tenantId) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Find all 'scheduled' rows with due_date <= today and no monthly_record_id
    const scheduledPayments = await prisma.payment_schedules.findMany({
      where: {
        tenant_id: tenantId,
        status: 'scheduled',
        due_date: { lte: today },
        monthly_record_id: null,
      },
    });

    logger.info({ tenant_id: tenantId, count: scheduledPayments.length }, 'Found scheduled payments to bill');

    for (const schedule of scheduledPayments) {
      try {
        // Find or create monthly_record for this room/month/year
        let monthlyRecord = await prisma.monthly_records.findFirst({
          where: {
            room_id: schedule.room_id,
            month: schedule.month,
            year: schedule.year,
          },
        });

        if (!monthlyRecord) {
          // Create new monthly_record
          monthlyRecord = await prisma.monthly_records.create({
            data: {
              tenant_id: tenantId,
              camp_id: schedule.camp_id,
              room_id: schedule.room_id,
              month: schedule.month,
              year: schedule.year,
              monthly_rent: schedule.scheduled_amount,
              total_paid: 0,
              balance: schedule.scheduled_amount,
              created_at: new Date(),
            },
          });
        }

        // Link schedule to monthly_record and update status to 'billed'
        await prisma.payment_schedules.update({
          where: { id: schedule.id },
          data: {
            monthly_record_id: monthlyRecord.id,
            status: 'billed',
          },
        });

        logger.info({ schedule_id: schedule.id, monthly_record_id: monthlyRecord.id }, 'Payment schedule billed');
      } catch (error) {
        logger.error({ schedule_id: schedule.id, error: error.message }, 'Error billing payment schedule');
      }
    }

    return scheduledPayments.length;
  } catch (error) {
    logger.error({ tenant_id: tenantId, error: error.message }, 'Error generating billed records');
    return 0;
  }
}

/**
 * Mark overdue payments and create notifications
 * Runs daily, marks payments overdue after grace period
 */
async function markOverdueForTenant(tenantId) {
  try {
    // Check feature flag
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        feature_flags: true,
      },
    });

    if (!tenant?.feature_flags?.payment_overdue_alerts) {
      logger.debug({ tenant_id: tenantId }, 'Payment overdue alerts disabled for tenant');
      return 0;
    }

    const today = new Date();
    const graceDeadline = new Date();
    graceDeadline.setDate(graceDeadline.getDate() - GRACE_DAYS);

    // Find 'billed' payments past grace period
    const overduePayments = await prisma.payment_schedules.findMany({
      where: {
        tenant_id: tenantId,
        status: 'billed',
        due_date: { lte: graceDeadline },
      },
      include: {
        rooms: { select: { room_number: true } },
        monthly_records: { select: { balance: true } },
        contracts: { select: { company_id: true, individual_id: true } },
        room_occupancy: { select: { company_id: true, individual_id: true } },
      },
    });

    logger.info({ tenant_id: tenantId, count: overduePayments.length }, 'Found overdue payments');

    let markedCount = 0;

    for (const payment of overduePayments) {
      try {
        // Update status to 'overdue'
        await prisma.payment_schedules.update({
          where: { id: payment.id },
          data: { status: 'overdue' },
        });

        // Determine entity (company or individual) for notification
        const company_id = payment.contracts?.company_id || payment.room_occupancy?.company_id;
        const individual_id = payment.contracts?.individual_id || payment.room_occupancy?.individual_id;

        // Get entity name
        let entity_name = 'Unknown';
        if (company_id) {
          const company = await prisma.companies.findUnique({
            where: { id: company_id },
            select: { name: true },
          });
          entity_name = company?.name || 'Unknown Company';
        } else if (individual_id) {
          const individual = await prisma.individuals.findUnique({
            where: { id: individual_id },
            select: { owner_name: true },
          });
          entity_name = individual?.owner_name || 'Unknown Individual';
        }

        // Check if notification already exists (deduplication)
        const existingNotification = await prisma.notifications.findFirst({
          where: {
            tenant_id: tenantId,
            type: 'payment_overdue',
            entity_type: 'payment_schedules',
            entity_id: payment.id,
          },
        });

        if (!existingNotification) {
          // Create notification
          await prisma.notifications.create({
            data: {
              tenant_id: tenantId,
              user_id: null, // System notification (could be assigned to admins)
              title: `Payment Overdue: ${entity_name}`,
              message: `Room ${payment.rooms.room_number} - ${entity_name} - ${payment.month}/${payment.year} - Balance: AED ${payment.monthly_records?.balance || payment.scheduled_amount}`,
              type: 'payment_overdue',
              entity_type: 'payment_schedules',
              entity_id: payment.id,
            },
          });

          logger.info({ payment_id: payment.id, room: payment.rooms.room_number }, 'Overdue notification created');
        }

        markedCount++;
      } catch (error) {
        logger.error({ payment_id: payment.id, error: error.message }, 'Error marking payment overdue');
      }
    }

    return markedCount;
  } catch (error) {
    logger.error({ tenant_id: tenantId, error: error.message }, 'Error marking overdue payments');
    return 0;
  }
}

/**
 * Main billing cron job
 * Runs daily at 01:00 Dubai time
 */
async function runBillingCron() {
  logger.info('Starting billing cron job');

  try {
    // Get all active tenants
    const tenants = await prisma.tenants.findMany({
      where: { is_active: true },
      select: { id: true, slug: true },
    });

    for (const tenant of tenants) {
      logger.info({ tenant_id: tenant.id, tenant_slug: tenant.slug }, 'Processing billing for tenant');

      // Generate billed records (only on 1st of month)
      const today = new Date();
      if (today.getDate() === 1) {
        const billedCount = await generateBilledRecordsForTenant(tenant.id);
        logger.info({ tenant_id: tenant.id, billed_count: billedCount }, 'Monthly records created');
      }

      // Mark overdue payments (runs daily)
      const overdueCount = await markOverdueForTenant(tenant.id);
      logger.info({ tenant_id: tenant.id, overdue_count: overdueCount }, 'Overdue payments marked');
    }

    logger.info('Billing cron job completed');
  } catch (error) {
    logger.error({ error: error.message }, 'Billing cron job failed');
  }
}

/**
 * Start billing cron job
 * Runs daily at 01:00 Dubai time (Asia/Dubai)
 */
export function startBillingCron() {
  // Schedule: 0 1 * * * = At 01:00 every day
  cron.schedule('0 1 * * *', runBillingCron, {
    timezone: 'Asia/Dubai',
  });

  logger.info('[BillingCron] Scheduled — runs daily at 01:00 Dubai time');
}
