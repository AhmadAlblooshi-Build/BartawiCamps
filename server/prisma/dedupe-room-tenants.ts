import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// -------- normalization helpers --------

const STRIP_SUFFIXES = [
  'LLC', 'L.L.C', 'L.L.C.', 'LTD', 'LIMITED', 'BLD', 'BUILDING', 'BLDG',
  'CO', 'CO.', 'COMPANY', 'TRADING', 'CONTRACTING', 'CONTARCTING',
  'TECHNICAL SERVICES', 'ELECTROMECHANICAL', 'TRANSPORT', 'SERVICES',
  'INDUSTRIES', 'ENTERPRISES', 'INC', 'INCORPORATED'
]

function normalizeKey(name: string): string {
  if (!name) return ''

  let normalized = name.toUpperCase().trim()

  // Strip suffixes
  for (const suffix of STRIP_SUFFIXES) {
    const regex = new RegExp(`\\b${suffix.replace('.', '\\.')}\\b`, 'gi')
    normalized = normalized.replace(regex, '')
  }

  // Remove punctuation and extra whitespace
  normalized = normalized.replace(/[.,\-_]/g, ' ')
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Keep first 2-3 significant words
  const words = normalized.split(' ').filter(w => w.length > 0)
  return words.slice(0, 3).join(' ')
}

// -------- explicit aliases --------

const EXPLICIT_MERGES: Record<string, string> = {
  'TAYAS CONTARCTING LLC': 'TAYAS CONTRACTING LLC',
  'TAYAS CONTARCTING': 'TAYAS CONTRACTING LLC',
  'TAYAS': 'TAYAS CONTRACTING LLC',

  'HHM BLD CONTRACTING': 'HHM ELECTROMECHANICAL LLC',
  'HHM BLD': 'HHM ELECTROMECHANICAL LLC',
  'HHM BUILDING CONTRACTING LLC': 'HHM ELECTROMECHANICAL LLC',
  'HHM BUILDING': 'HHM ELECTROMECHANICAL LLC',

  'JUBILY SUPER MARKET': 'JUBILY SUPERMARKET',
  'JUBLI SUPER MARKET': 'JUBILY SUPERMARKET',
  'JUBLI SUPERMARKET': 'JUBILY SUPERMARKET',

  'AL HAYAT ALBSYTH CO': 'AL HAYAT',
}

// -------- main deduplication --------

async function deduplicate() {
  console.log('\n========================================')
  console.log('ROOM TENANTS DEDUPLICATION')
  console.log('========================================\n')

  // Fetch all room_tenants (companies only for now, individuals are typically unique)
  const allTenants = await prisma.room_tenants.findMany({
    where: { is_company: true },
    include: {
      leases: { select: { id: true } },
      monthly_records: { select: { id: true } },
    },
    orderBy: { company_name: 'asc' },
  })

  console.log(`Found ${allTenants.length} company tenants to analyze\n`)

  // Step 1: Apply explicit merges first
  console.log('=== EXPLICIT MERGES ===\n')

  const explicitMergeLog: Array<{ from: string; to: string; leases: number }> = []

  for (const [fromName, toName] of Object.entries(EXPLICIT_MERGES)) {
    const duplicates = allTenants.filter(t =>
      t.company_name?.toUpperCase().trim() === fromName
    )

    if (duplicates.length === 0) continue

    // Find canonical (must exist or we'll create confusion)
    let canonical = allTenants.find(t =>
      t.company_name?.toUpperCase().trim() === toName
    )

    // If canonical doesn't exist, use first duplicate and rename it
    if (!canonical && duplicates.length > 0) {
      canonical = duplicates[0]
      await prisma.room_tenants.update({
        where: { id: canonical.id },
        data: { company_name: toName },
      })
      console.log(`  Renamed: "${canonical.company_name}" → "${toName}"`)
      duplicates.shift() // Remove from duplicates list
    }

    if (!canonical) continue

    for (const dup of duplicates) {
      if (dup.id === canonical.id) continue

      await prisma.$transaction(async (tx) => {
        // Re-point leases
        await tx.leases.updateMany({
          where: { room_tenant_id: dup.id },
          data: { room_tenant_id: canonical.id },
        })

        // Re-point monthly_records
        await tx.monthly_records.updateMany({
          where: { room_tenant_id: dup.id },
          data: { room_tenant_id: canonical.id },
        })

        // Delete duplicate
        await tx.room_tenants.delete({
          where: { id: dup.id },
        })
      })

      explicitMergeLog.push({
        from: dup.company_name || '',
        to: canonical.company_name || '',
        leases: dup.leases.length,
      })

      console.log(`  Merged: "${dup.company_name}" (${dup.leases.length} leases) → "${canonical.company_name}"`)
    }
  }

  console.log(`\n  Total explicit merges: ${explicitMergeLog.length}\n`)

  // Step 2: Fuzzy deduplication by normalized key
  console.log('=== FUZZY DEDUPLICATION ===\n')

  // Re-fetch after explicit merges
  const remainingTenants = await prisma.room_tenants.findMany({
    where: { is_company: true },
    include: {
      leases: { select: { id: true } },
      monthly_records: { select: { id: true } },
    },
    orderBy: { company_name: 'asc' },
  })

  // Group by normalized key
  const groups = new Map<string, typeof remainingTenants>()

  for (const tenant of remainingTenants) {
    if (!tenant.company_name) continue
    const key = normalizeKey(tenant.company_name)
    if (!key) continue

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(tenant)
  }

  const fuzzyMergeLog: Array<{ from: string; to: string; leases: number }> = []
  let fuzzyMergeCount = 0

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue

    // Skip if this looks like Jubily (special case - keep tea shop separate)
    if (key.includes('JUBILY') || key.includes('JUBLI')) {
      const hasTeaShop = group.some(t => t.company_name?.toUpperCase().includes('TEA SHOP'))
      const hasOthers = group.some(t => !t.company_name?.toUpperCase().includes('TEA SHOP'))

      if (hasTeaShop && hasOthers) {
        // Split group: tea shop stays separate
        const teaShop = group.filter(t => t.company_name?.toUpperCase().includes('TEA SHOP'))
        const others = group.filter(t => !t.company_name?.toUpperCase().includes('TEA SHOP'))

        // Process non-tea-shop group
        if (others.length > 1) {
          await processFuzzyGroup(key, others, fuzzyMergeLog)
          fuzzyMergeCount += others.length - 1
        }

        continue
      }
    }

    await processFuzzyGroup(key, group, fuzzyMergeLog)
    fuzzyMergeCount += group.length - 1
  }

  console.log(`\n  Total fuzzy merges: ${fuzzyMergeCount}\n`)

  // Print merge log
  console.log('=== MERGE LOG ===\n')

  const allMerges = [...explicitMergeLog, ...fuzzyMergeLog]

  // Group by canonical name
  const mergesByCanonical = new Map<string, number>()
  for (const merge of allMerges) {
    mergesByCanonical.set(
      merge.to,
      (mergesByCanonical.get(merge.to) || 0) + merge.leases
    )
  }

  for (const [canonical, totalLeases] of mergesByCanonical.entries()) {
    const merges = allMerges.filter(m => m.to === canonical)
    console.log(`\n${canonical}:`)
    for (const m of merges) {
      console.log(`  ← "${m.from}" (${m.leases} leases)`)
    }
    console.log(`  = ${totalLeases} total leases after merge`)
  }

  console.log('\n========================================')
  console.log('DEDUPLICATION COMPLETE')
  console.log('========================================\n')

  await prisma.$disconnect()
}

async function processFuzzyGroup(
  key: string,
  group: Array<any>,
  log: Array<{ from: string; to: string; leases: number }>
) {
  // Pick canonical: longest name (most complete/formal)
  const canonical = group.reduce((longest, current) => {
    return (current.company_name?.length || 0) > (longest.company_name?.length || 0)
      ? current
      : longest
  })

  console.log(`\nGroup "${key}":`)
  console.log(`  Canonical: "${canonical.company_name}" (${canonical.leases.length} leases)`)

  const duplicates = group.filter(t => t.id !== canonical.id)

  for (const dup of duplicates) {
    await prisma.$transaction(async (tx) => {
      // Re-point leases
      await tx.leases.updateMany({
        where: { room_tenant_id: dup.id },
        data: { room_tenant_id: canonical.id },
      })

      // Re-point monthly_records
      await tx.monthly_records.updateMany({
        where: { room_tenant_id: dup.id },
        data: { room_tenant_id: canonical.id },
      })

      // Delete duplicate
      await tx.room_tenants.delete({
        where: { id: dup.id },
      })
    })

    log.push({
      from: dup.company_name || '',
      to: canonical.company_name || '',
      leases: dup.leases.length,
    })

    console.log(`  Merged: "${dup.company_name}" (${dup.leases.length} leases)`)
  }
}

deduplicate().catch(err => {
  console.error('\n❌ DEDUPLICATION FAILED:', err)
  process.exit(1)
})
