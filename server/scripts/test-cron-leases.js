import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dryRun() {
  const month = 4;
  const year = 2026;

  console.log(`\n=== DRY RUN: Monthly Record Auto-Creation for ${month}/${year} ===\n`);

  const activeLeases = await prisma.leases.findMany({
    where: { status: 'active' },
    include: { room: true, tenant: true },
  });

  let wouldCreate = 0;
  let wouldSkip = 0;
  const skipReasons = {
    alreadyExists: [],
  };

  for (const lease of activeLeases) {
    const existing = await prisma.monthly_records.findFirst({
      where: { lease_id: lease.id, month, year },
    });

    if (existing) {
      wouldSkip++;
      skipReasons.alreadyExists.push({
        lease_id: lease.id,
        room: lease.room?.room_number,
        tenant: lease.tenant?.full_name || lease.tenant?.company_name,
      });
    } else {
      wouldCreate++;
    }
  }

  console.log(`Total active leases: ${activeLeases.length}`);
  console.log(`Would create: ${wouldCreate}`);
  console.log(`Would skip (already exist): ${wouldSkip}`);
  console.log(`\nSkip breakdown:`);
  console.log(`  Already have ${month}/${year} record: ${skipReasons.alreadyExists.length}`);

  if (skipReasons.alreadyExists.length > 0 && skipReasons.alreadyExists.length <= 10) {
    console.log(`\nExisting records (sample):`);
    skipReasons.alreadyExists.forEach((r) => {
      console.log(`  - ${r.room}: ${r.tenant}`);
    });
  }

  console.log(`\n✓ Dry run complete. No records created.\n`);

  await prisma.$disconnect();
}

dryRun().catch((error) => {
  console.error('Dry run failed:', error);
  process.exit(1);
});
