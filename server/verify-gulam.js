import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('\n=== GULAM MURTAZA VERIFICATION ===\n');

// Query 1: How many room_tenants match?
console.log('1. ROOM_TENANTS MATCHING GULAM MURTAZA:\n');
const tenants = await prisma.$queryRaw`
  SELECT id, full_name, company_name, is_company
  FROM room_tenants
  WHERE full_name ILIKE '%Gulam%Murtaza%'
     OR company_name ILIKE '%Gulam%Murtaza%'
     OR full_name ILIKE '%Murtaza%Transport%'
     OR company_name ILIKE '%Murtaza%Transport%'
`;
console.table(tenants);
console.log(`Total matches: ${tenants.length}\n`);

if (tenants.length > 1) {
  console.log('⚠️  WARNING: Multiple room_tenants found - fuzzy matcher may have failed to merge variants\n');
}

// Query 2: What rooms does the lease cover?
console.log('2. LEASES FOR GULAM MURTAZA:\n');
const leases = await prisma.$queryRaw`
  SELECT r.room_number, l.status, l.monthly_rent, l.start_date, l.end_date
  FROM leases l
  JOIN room_tenants rt ON l.room_tenant_id = rt.id
  JOIN rooms r ON l.room_id = r.id
  WHERE rt.full_name ILIKE '%Gulam%' OR rt.company_name ILIKE '%Gulam%'
  ORDER BY r.room_number
`;
console.table(leases);
console.log(`Total leases: ${leases.length}\n`);

// Query 3: What does source monthly_records show?
console.log('3. SOURCE MONTHLY_RECORDS DATA:\n');
const sourceData = await prisma.$queryRaw`
  SELECT DISTINCT r.room_number, mr.owner_name, mr.company_name
  FROM monthly_records mr
  JOIN rooms r ON mr.room_id = r.id
  WHERE (mr.owner_name ILIKE '%Gulam%' OR mr.company_name ILIKE '%Gulam%'
      OR mr.owner_name ILIKE '%Murtaza%' OR mr.company_name ILIKE '%Murtaza%')
  ORDER BY r.room_number
`;
console.table(sourceData);
console.log(`Total distinct rooms in source: ${sourceData.length}\n`);

// Analysis
console.log('=== ANALYSIS ===\n');
console.log(`Expected rooms from Camp 1 spreadsheet: AA09, AA10, AA11, AA13 (4 rooms)`);
console.log(`Actual rooms found in source data:      ${sourceData.length} room(s)`);
console.log(`Actual leases created:                  ${leases.length} lease(s)`);

if (tenants.length > 1) {
  console.log('\n❌ ISSUE: Multiple room_tenants exist - fuzzy deduplication failed');
} else if (leases.length < sourceData.length) {
  console.log('\n❌ ISSUE: Leases were dropped during dedupe - not all rooms have leases');
} else if (sourceData.length < 4) {
  console.log('\n✅ OK: Source data only has ' + sourceData.length + ' room(s) - spreadsheet expectation was wrong');
} else {
  console.log('\n✅ OK: All rooms accounted for');
}

await prisma.$disconnect();
