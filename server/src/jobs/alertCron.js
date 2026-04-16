import cron from 'node-cron';
import prisma from '../lib/prisma.js';

/**
 * Check contracts expiring at 90/60/30 days and already-expired.
 * Creates ONE notification per contract per threshold, ever — unless
 * the previous one was acknowledged (renewed, terminated, or manually ack'd).
 */
async function checkContractExpiryForTenant(tenantId) {
  const now = new Date();

  const thresholds = [
    { days: 90, type: 'expiring_90d' },
    { days: 60, type: 'expiring_60d' },
    { days: 30, type: 'expiring_30d' },
    { days: 0,  type: 'expired' },
  ];

  for (const threshold of thresholds) {
    // Window for "about to cross threshold" — give a day of leeway
    // so we don't miss if cron was down one day.
    // For expired: everything past end_date that's still status=active.
    let whereEndDate;
    if (threshold.days === 0) {
      whereEndDate = { lt: now };
    } else {
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() + threshold.days - 1);  // 1-day leeway
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + threshold.days);
      windowEnd.setHours(23, 59, 59, 999);
      whereEndDate = { gte: windowStart, lte: windowEnd };
    }

    const contracts = await prisma.contracts.findMany({
      where: {
        status: 'active',
        end_date: whereEndDate,
        camps: { tenant_id: tenantId }
      },
      include: {
        rooms: { select: { room_number: true } },
        companies: { select: { name: true } },
      }
    });

    for (const contract of contracts) {
      // NEW DEDUP: check for ANY unacknowledged alert of this type for this contract
      const existing = await prisma.contract_alerts.findFirst({
        where: {
          contract_id: contract.id,
          alert_type: threshold.type,
          is_acknowledged: false,
        }
      });
      if (existing) continue;  // already notified, don't spam

      // SNOOZE-AWARE: check if the tenant recently snoozed a notification for this contract
      const activeSnoozeCount = await prisma.notifications.count({
        where: {
          tenant_id: tenantId,
          resource_type: 'contract',
          resource_id: contract.id,
          type: threshold.type,
          snoozed_until: { gt: now },
        }
      });
      if (activeSnoozeCount > 0) continue;  // respect active snooze

      const companyName = contract.companies?.name || 'Unknown Company';
      const roomNo = contract.rooms?.room_number || 'Unknown Room';
      const daysLeft = threshold.days === 0
        ? Math.abs(Math.ceil((now - new Date(contract.end_date)) / (1000 * 60 * 60 * 24)))
        : Math.ceil((new Date(contract.end_date) - now) / (1000 * 60 * 60 * 24));

      const title = threshold.days === 0
        ? `Contract Expired — ${companyName}`
        : `Contract Expiring — ${companyName}`;

      const message = threshold.days === 0
        ? `${companyName} · Room ${roomNo} contract expired ${daysLeft} day${daysLeft !== 1 ? 's' : ''} ago. Renew or terminate.`
        : `${companyName} · Room ${roomNo} contract expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`;

      await prisma.$transaction([
        prisma.notifications.create({
          data: {
            tenant_id: tenantId,
            type: threshold.type,
            title,
            message,
            resource_type: 'contract',
            resource_id: contract.id,
            is_read: false,
          }
        }),
        prisma.contract_alerts.create({
          data: {
            contract_id: contract.id,
            camp_id: contract.camp_id,
            alert_type: threshold.type,
            days_until_expiry: threshold.days === 0 ? -daysLeft : daysLeft,
            is_acknowledged: false,
          }
        })
      ]);
    }
  }
}

async function checkContractExpiryAllTenants() {
  console.log('[AlertCron] Running expiry check for all tenants');
  const tenants = await prisma.tenants.findMany({
    where: { is_active: true },
    select: { id: true }
  });
  for (const t of tenants) {
    const flag = await prisma.feature_flags.findFirst({
      where: { tenant_id: t.id, flag_key: 'contract_auto_alerts' }
    });
    if (!flag?.is_enabled) continue;
    try {
      await checkContractExpiryForTenant(t.id);
    } catch (err) {
      console.error(`[AlertCron] Failed for tenant ${t.id}:`, err.message);
    }
  }
  console.log('[AlertCron] Complete');
}

export function startAlertCron() {
  cron.schedule('0 6 * * *', checkContractExpiryAllTenants, {
    timezone: 'Asia/Dubai'
  });
  console.log('[AlertCron] Scheduled — runs daily at 06:00 Dubai time');
  // NO immediate-run on startup. Cron handles it.
}

export { checkContractExpiryAllTenants, checkContractExpiryForTenant };
