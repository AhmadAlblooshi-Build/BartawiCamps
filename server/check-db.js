import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname='public'
      AND tablename IN ('permissions', 'room_tenants', 'leases', 'lease_payments')
      ORDER BY tablename
    `;
    console.log('=== TABLE EXISTENCE CHECK ===');
    console.log('permissions:', tables.some(t => t.tablename === 'permissions') ? 'EXISTS' : 'MISSING');
    console.log('room_tenants:', tables.some(t => t.tablename === 'room_tenants') ? 'EXISTS' : 'MISSING');
    console.log('leases:', tables.some(t => t.tablename === 'leases') ? 'EXISTS' : 'MISSING');
    console.log('lease_payments:', tables.some(t => t.tablename === 'lease_payments') ? 'EXISTS' : 'MISSING');

    const mrColumns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='monthly_records'
      AND column_name IN ('tenant_id', 'lease_id')
    `;
    console.log('\n=== MONTHLY_RECORDS COLUMNS ===');
    console.log('tenant_id:', mrColumns.some(c => c.column_name === 'tenant_id') ? 'EXISTS' : 'MISSING');
    console.log('lease_id:', mrColumns.some(c => c.column_name === 'lease_id') ? 'EXISTS' : 'MISSING');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
