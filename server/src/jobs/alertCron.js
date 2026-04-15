import cron from 'node-cron';
import prisma from '../lib/prisma.js';

async function checkContractExpiry() {
  console.log('[AlertCron] Running contract expiry check...');
  try {
    const tenant = await prisma.tenants.findFirst({ where: { slug: 'bartawi' } });
    if (!tenant) return;

    const now = new Date();
    const thresholds = [
      { days: 90, type: 'expiring_90d', label: 'expiring in 90 days' },
      { days: 60, type: 'expiring_60d', label: 'expiring in 60 days' },
      { days: 30, type: 'expiring_30d', label: 'expiring in 30 days' },
      { days: 0,  type: 'expired',      label: 'has expired' },
    ];

    for (const threshold of thresholds) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + threshold.days);
      const windowStart = new Date(targetDate);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(targetDate);
      windowEnd.setHours(23, 59, 59, 999);

      const contracts = await prisma.contracts.findMany({
        where: {
          status: 'active',
          end_date: threshold.days === 0
            ? { lt: now }
            : { gte: windowStart, lte: windowEnd },
        },
        include: {
          rooms: { select: { room_number: true } },
          companies: { select: { name: true } },
        }
      });

      for (const contract of contracts) {
        // Check if we already sent this specific alert recently (last 24h)
        const recent = await prisma.notifications.findFirst({
          where: {
            tenant_id: tenant.id,
            resource_type: 'contract',
            resource_id: contract.id,
            type: threshold.type,
            created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          }
        });
        if (recent) continue;

        const companyName = contract.companies?.name || 'Unknown Company';
        const roomNo = contract.rooms?.room_number || 'Unknown Room';
        const daysLeft = threshold.days === 0
          ? 0
          : Math.ceil((new Date(contract.end_date) - now) / (1000 * 60 * 60 * 24));

        await prisma.notifications.create({
          data: {
            tenant_id: tenant.id,
            type: threshold.type,
            title: threshold.days === 0
              ? `Contract Expired — ${companyName}`
              : `Contract Expiring — ${companyName}`,
            message: threshold.days === 0
              ? `${companyName} · Room ${roomNo} contract has expired. Renew or terminate immediately.`
              : `${companyName} · Room ${roomNo} contract ${threshold.label} (${daysLeft} days remaining).`,
            resource_type: 'contract',
            resource_id: contract.id,
            is_read: false,
            created_at: new Date(),
          }
        });

        // Also log in contract_alerts table
        await prisma.contract_alerts.create({
          data: {
            contract_id: contract.id,
            camp_id: contract.camp_id,
            alert_type: threshold.type,
            days_until_expiry: daysLeft,
            is_acknowledged: false,
            created_at: new Date(),
          }
        });
      }
    }
    console.log('[AlertCron] Contract expiry check complete');
  } catch (err) {
    console.error('[AlertCron] Error:', err.message);
  }
}

// Run daily at 6:00 AM Dubai time (UTC+4 = 02:00 UTC)
function startAlertCron() {
  cron.schedule('0 2 * * *', checkContractExpiry, {
    timezone: 'Asia/Dubai'
  });
  console.log('[AlertCron] Scheduled — runs daily at 06:00 Dubai time');
  // Run immediately on startup to catch any current issues
  checkContractExpiry();
}

export { startAlertCron, checkContractExpiry };
