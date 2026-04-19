import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('\n=== VERIFICATION REPORT ===\n');

// 1. Tenant summary
const tenantSummary = await prisma.$queryRaw`
  SELECT COUNT(*) AS total_tenants,
         SUM(CASE WHEN is_company THEN 1 ELSE 0 END) AS companies,
         SUM(CASE WHEN NOT is_company THEN 1 ELSE 0 END) AS individuals
  FROM room_tenants
`;
console.log('1. TENANT SUMMARY:');
console.log(tenantSummary[0]);

// 2. Known tenants check
const knownTenants = await prisma.$queryRaw`
  SELECT id, full_name, company_name, is_company FROM room_tenants
  WHERE company_name ILIKE '%Tayas%'
     OR company_name ILIKE '%HHM%'
     OR company_name ILIKE '%Petra Oasis%'
     OR company_name ILIKE '%Al Hayat%'
     OR company_name ILIKE '%Jubily%'
     OR full_name = 'Mahmoud Attia'
  ORDER BY is_company DESC, company_name, full_name
`;
console.log('\n2. KNOWN TENANTS:');
console.table(knownTenants);

// 3. Tayas leases
const tayasLeases = await prisma.$queryRaw`
  SELECT r.room_number, l.status, l.start_date, l.end_date, l.monthly_rent
  FROM leases l
  JOIN room_tenants t ON l.room_tenant_id = t.id
  JOIN rooms r ON l.room_id = r.id
  WHERE t.company_name ILIKE '%Tayas%'
  ORDER BY r.room_number
`;
console.log('\n3. TAYAS LEASES (expect ~25, all expired):');
console.log(`Total: ${tayasLeases.length}`);
console.table(tayasLeases.slice(0, 5));
console.log(`Status breakdown:`, tayasLeases.reduce((acc, l) => {
  acc[l.status] = (acc[l.status] || 0) + 1;
  return acc;
}, {}));

// 4. HHM leases
const hhmLeases = await prisma.$queryRaw`
  SELECT r.room_number, l.status, l.end_date, l.monthly_rent
  FROM leases l
  JOIN room_tenants t ON l.room_tenant_id = t.id
  JOIN rooms r ON l.room_id = r.id
  WHERE t.company_name ILIKE '%HHM%'
  ORDER BY r.room_number
`;
console.log('\n4. HHM LEASES (expect ~12, active, end 2026-12-30):');
console.log(`Total: ${hhmLeases.length}`);
console.table(hhmLeases);

// 5. Jubily leases
const jubilyLeases = await prisma.$queryRaw`
  SELECT r.room_number, l.status, l.monthly_rent
  FROM leases l
  JOIN room_tenants t ON l.room_tenant_id = t.id
  JOIN rooms r ON l.room_id = r.id
  WHERE t.company_name ILIKE '%Jubily%'
  ORDER BY r.room_number
`;
console.log('\n5. JUBILY LEASES (expect ~4):');
console.log(`Total: ${jubilyLeases.length}`);
console.table(jubilyLeases);

// 6. Petra Oasis leases
const petraLeases = await prisma.$queryRaw`
  SELECT r.room_number, l.status, l.contract_type, l.end_date
  FROM leases l
  JOIN room_tenants t ON l.room_tenant_id = t.id
  JOIN rooms r ON l.room_id = r.id
  WHERE t.company_name ILIKE '%Petra%'
  ORDER BY r.room_number
`;
console.log('\n6. PETRA OASIS LEASES (expect ~9, yearly):');
console.log(`Total: ${petraLeases.length}`);
console.table(petraLeases);

// 7. Backfill completeness
const backfillStats = await prisma.$queryRaw`
  SELECT
    COUNT(*) FILTER (WHERE room_tenant_id IS NOT NULL) AS with_room_tenant,
    COUNT(*) FILTER (WHERE room_tenant_id IS NULL)     AS without_room_tenant,
    COUNT(*)                                           AS total
  FROM monthly_records
`;
console.log('\n7. BACKFILL COMPLETENESS:');
console.log(backfillStats[0]);

// 8. Historical payments
const paymentStats = await prisma.$queryRaw`
  SELECT COUNT(*) AS total_payments,
         SUM(CASE WHEN notes LIKE 'Historical%' THEN 1 ELSE 0 END) AS historical
  FROM lease_payments
`;
console.log('\n8. HISTORICAL PAYMENTS:');
console.log(paymentStats[0]);

console.log('\n=== END VERIFICATION ===\n');

await prisma.$disconnect();
