import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BARTAWI_TENANT_ID = 'a17e9d40-a011-a14e-0b0e-67b0a0dbc71f'

// -------- helpers --------

const COMPANY_KEYWORDS = [
  'llc', 'co.', 'co ', 'company', 'contracting', 'trading', 'technical', 'services',
  'industries', 'ltd', 'transport', 'enterprises', 'bld', 'building', 'construction',
  'tayas', 'hhm', 'mizna', 'phoenix', 'falcon', 'venus', 'zakum', 'petra', 'oasis',
  'al hayat', 'gulf fidelity', 'advance aluminium', 'advanced aluminium', 'jubily',
  'jubli', 'supermarket', 'restaurant', 'kebab', 'zaiqa', 'zaika', 'kabul city',
  'paints', 'cargo', 'base plate', 'acrilic', 'structural steel', 'half million',
  'idear star', 'ambigram', 'favourite plus', 'favorite plus', 'hashim darwish',
  'reno space', 'jelnar', 'blue ginger', 'olive star', 'czar', 'malik', 'm.b.k',
  'mbk', 'rithi', 'cool wood', 'ana interior', 'bait al', 'shwifat', '800 truck',
  'jadar', 'zadar', 'truck', 'new phoenix', 'aits', 'banam', 'pristine', 'cyana',
  'zaykaa', 'carpentors', 'vaitaf', 'kasco', 'gbt golden', 'mindmap', 'johns paints',
  'al junaibi', 'al deraa', 'al naami', 'shaklan', 'shield', 'bin bador',
  'noor transport', 'sadaf', 'sofa mastar', 'sheikh', 'technofin', 'mashreq',
  'sahani', 'yadave', 'yadav', 'cont', 'trd',
]

const EXCLUDE_KEYWORDS = [
  'bartawi', 'camp boss', 'bgc room', 'camp office', 'security room',
  'cleaners', 'mosque', 'electricity room', 'vacant', 'bgc ', 'security',
]

function isCompanyName(name: string): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return COMPANY_KEYWORDS.some(kw => n.includes(kw))
}

function isExcludedEntity(name: string): boolean {
  if (!name) return true
  const n = name.toLowerCase().trim()
  return EXCLUDE_KEYWORDS.some(k => n.includes(k))
}

function normalizeName(raw: string): string {
  return (raw || '').trim().replace(/\s+/g, ' ').toUpperCase()
}

// -------- main --------

async function migrate() {
  console.log('\n========================================')
  console.log('BARTAWI WRITE-LAYER MIGRATION')
  console.log('========================================\n')

  const allRecords = await prisma.monthly_records.findMany({
    select: {
      id: true, room_id: true, owner_name: true, company_name: true,
      contract_type: true, contract_start_date: true, contract_end_date: true,
      rent: true, paid: true, month: true, year: true,
    },
    orderBy: [{ room_id: 'asc' }, { year: 'asc' }, { month: 'asc' }],
  })
  console.log(`Total monthly_records to process: ${allRecords.length}`)

  // ---- Pass 1: create unique room_tenants ----
  console.log('\n[1/4] Creating unique room_tenants…')
  const tenantByKey = new Map<string, { id: string; isCompany: boolean }>()

  for (const r of allRecords) {
    const raw = ((r.company_name || r.owner_name) ?? '').trim()
    if (!raw || isExcludedEntity(raw)) continue

    const key = normalizeName(raw)
    if (tenantByKey.has(key)) continue

    const isCompany = isCompanyName(raw) || !!r.company_name
    const t = await prisma.room_tenants.create({
      data: {
        tenant_id: BARTAWI_TENANT_ID,
        full_name: isCompany ? null : raw,
        company_name: isCompany ? raw : null,
        is_company: isCompany,
      },
    })
    tenantByKey.set(key, { id: t.id, isCompany })
  }
  console.log(`  → ${tenantByKey.size} unique room_tenants created`)

  // ---- Pass 2: create one lease per (room_tenant, room) ----
  console.log('\n[2/4] Creating leases…')
  const leaseByKey = new Map<string, string>()  // `${room_tenant_id}::${room_id}` → lease_id
  let leasesCreated = 0

  for (const r of allRecords) {
    const raw = ((r.company_name || r.owner_name) ?? '').trim()
    if (!raw || isExcludedEntity(raw)) continue

    const tenant = tenantByKey.get(normalizeName(raw))
    if (!tenant) continue

    const leaseKey = `${tenant.id}::${r.room_id}`
    if (leaseByKey.has(leaseKey)) continue

    const startDate = r.contract_start_date
      || new Date(Date.UTC(r.year, r.month - 1, 1))
    const endDate = r.contract_end_date
    const contractType = (r.contract_type ?? '').toLowerCase().includes('yearly')
      ? 'yearly' : 'monthly'
    const status = endDate && endDate < new Date() ? 'expired' : 'active'

    const lease = await prisma.leases.create({
      data: {
        saas_tenant_id: BARTAWI_TENANT_ID,
        room_tenant_id: tenant.id,
        room_id: r.room_id,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: r.rent,
        contract_type: contractType,
        status,
      },
    })
    leaseByKey.set(leaseKey, lease.id)
    leasesCreated++
  }
  console.log(`  → ${leasesCreated} leases created`)

  // ---- Pass 3: backfill room_tenant_id + lease_id on monthly_records ----
  console.log('\n[3/4] Backfilling monthly_records…')
  let recordsUpdated = 0
  for (const r of allRecords) {
    const raw = ((r.company_name || r.owner_name) ?? '').trim()
    if (!raw || isExcludedEntity(raw)) continue

    const tenant = tenantByKey.get(normalizeName(raw))
    if (!tenant) continue

    const leaseId = leaseByKey.get(`${tenant.id}::${r.room_id}`)
    if (!leaseId) continue

    await prisma.monthly_records.update({
      where: { id: r.id },
      data: { room_tenant_id: tenant.id, lease_id: leaseId },
    })
    recordsUpdated++
  }
  console.log(`  → ${recordsUpdated} monthly_records linked to room_tenant + lease`)

  // ---- Pass 4: create historical lease_payment rows for already-paid records ----
  console.log('\n[4/4] Creating historical lease_payment rows (audit chain)…')
  const paidRecords = await prisma.monthly_records.findMany({
    where: { paid: { gt: 0 }, lease_id: { not: null } },
    select: {
      id: true, lease_id: true, paid: true, month: true, year: true,
      lease_payments: { select: { id: true } },
    },
  })
  let paymentsCreated = 0
  for (const r of paidRecords) {
    if (r.lease_payments.length > 0) continue  // skip if already has payment rows
    await prisma.lease_payments.create({
      data: {
        tenant_id: BARTAWI_TENANT_ID,
        lease_id: r.lease_id!,
        monthly_record_id: r.id,
        amount: r.paid,
        payment_date: new Date(Date.UTC(r.year, r.month - 1, 1)),
        method: 'other',
        payment_type: 'rent',
        notes: 'Historical import — original method not recorded',
        logged_by_name: 'System Migration',
      },
    })
    paymentsCreated++
  }
  console.log(`  → ${paymentsCreated} historical lease_payments created`)

  console.log('\n========================================')
  console.log('MIGRATION COMPLETE')
  console.log('========================================\n')

  await prisma.$disconnect()
}

migrate().catch(err => {
  console.error('\n❌ MIGRATION FAILED:', err)
  process.exit(1)
})
