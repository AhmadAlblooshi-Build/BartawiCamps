import cron from 'node-cron';
import prisma from '../lib/prisma.js';

export async function ensureNextMonthPartition() {
  const now = new Date();
  // Create partition for NEXT month
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const following = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const partitionName = `sensor_readings_${yyyy}_${mm}`;
  const from = `${yyyy}-${mm}-01`;
  const to = following.toISOString().slice(0, 10);

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF sensor_readings
        FOR VALUES FROM ('${from}') TO ('${to}')
    `);
    console.log(`[PartitionCron] Created/verified ${partitionName}`);
  } catch (err) {
    console.error(`[PartitionCron] Failed to create ${partitionName}:`, err.message);
  }

  // Also yearly for audit_logs
  if (next.getMonth() === 11) {  // December, so January is next year
    const yearPartition = `audit_logs_${yyyy + 1}`;
    const fromY = `${yyyy + 1}-01-01`;
    const toY = `${yyyy + 2}-01-01`;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${yearPartition}
          PARTITION OF audit_logs
          FOR VALUES FROM ('${fromY}') TO ('${toY}')
      `);
      console.log(`[PartitionCron] Created ${yearPartition}`);
    } catch (err) {
      console.error(`[PartitionCron] Failed to create ${yearPartition}:`, err.message);
    }
  }
}

export function startPartitionCron() {
  // 25th of each month at 03:00 Dubai time
  cron.schedule('0 3 25 * *', ensureNextMonthPartition, {
    timezone: 'Asia/Dubai'
  });
  console.log('[PartitionCron] Scheduled — runs 25th of each month');
}
