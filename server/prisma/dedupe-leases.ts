import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deduplicate() {
  console.log('\n========================================')
  console.log('LEASE DEDUPLICATION')
  console.log('========================================\n')

  // -------- BEFORE COUNTS --------
  console.log('=== BASELINE COUNTS (BEFORE) ===\n')

  const beforeLeases = await prisma.leases.count()
  const beforeMonthlyRecords = await prisma.monthly_records.count()
  const beforePayments = await prisma.lease_payments.count()

  console.log(`Total leases:          ${beforeLeases}`)
  console.log(`Total monthly_records: ${beforeMonthlyRecords}`)
  console.log(`Total lease_payments:  ${beforePayments}`)

  const tayasBeforeLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'TAYAS', mode: 'insensitive' } }
    }
  })
  const hhmBeforeLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'HHM ELECTROMECHANICAL', mode: 'insensitive' } }
    }
  })
  const petraBeforeLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'Petra Oasis', mode: 'insensitive' } }
    }
  })

  console.log(`\nTayas leases:          ${tayasBeforeLeases}`)
  console.log(`HHM leases:            ${hhmBeforeLeases}`)
  console.log(`Petra Oasis leases:    ${petraBeforeLeases}`)

  // -------- FIND DUPLICATES --------
  console.log('\n=== FINDING DUPLICATE LEASES ===\n')

  const allLeases = await prisma.leases.findMany({
    include: {
      tenant: { select: { id: true, company_name: true, full_name: true, is_company: true } },
      room: { select: { id: true, room_number: true } },
      monthly_records: { select: { id: true } },
      payments: { select: { id: true } },
    },
    orderBy: [
      { room_tenant_id: 'asc' },
      { room_id: 'asc' },
      { start_date: 'desc' },
    ],
  })

  // Group by (room_tenant_id, room_id)
  const groups = new Map<string, typeof allLeases>()

  for (const lease of allLeases) {
    const key = `${lease.room_tenant_id}::${lease.room_id}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(lease)
  }

  const duplicateGroups = Array.from(groups.entries())
    .filter(([_, leases]) => leases.length > 1)

  console.log(`Total lease groups: ${groups.size}`)
  console.log(`Groups with duplicates: ${duplicateGroups.length}`)
  console.log(`Total leases to deduplicate: ${duplicateGroups.reduce((sum, [_, leases]) => sum + leases.length, 0)}`)

  // -------- DEDUPLICATION LOGIC --------
  console.log('\n=== DEDUPLICATION IN PROGRESS ===\n')

  const mergeLog: Array<{
    tenantName: string
    roomNumber: string
    beforeCount: number
    afterCount: number
    recordsRepointed: number
    paymentsRepointed: number
  }> = []

  let totalLeasesMerged = 0

  for (const [key, leases] of duplicateGroups) {
    if (leases.length <= 1) continue

    // Pick canonical using priority rules
    const canonical = leases.reduce((best, current) => {
      // Rule 1: end_date NOT NULL wins over NULL
      if (current.end_date && !best.end_date) return current
      if (!current.end_date && best.end_date) return best

      // Rule 2: If both have end_date, keep later one
      if (current.end_date && best.end_date) {
        return new Date(current.end_date) > new Date(best.end_date) ? current : best
      }

      // Rule 3: If both NULL, keep later start_date
      if (!current.end_date && !best.end_date) {
        return new Date(current.start_date) > new Date(best.start_date) ? current : best
      }

      return best
    })

    const duplicates = leases.filter(l => l.id !== canonical.id)

    if (duplicates.length === 0) continue

    const tenantName = canonical.tenant.is_company
      ? canonical.tenant.company_name || 'Unknown Company'
      : canonical.tenant.full_name || 'Unknown Individual'
    const roomNumber = canonical.room.room_number

    let recordsRepointed = 0
    let paymentsRepointed = 0

    // Re-point FKs and delete duplicates in a transaction
    await prisma.$transaction(async (tx) => {
      for (const dup of duplicates) {
        // Re-point monthly_records
        const updatedRecords = await tx.monthly_records.updateMany({
          where: { lease_id: dup.id },
          data: { lease_id: canonical.id },
        })
        recordsRepointed += updatedRecords.count

        // Re-point lease_payments
        const updatedPayments = await tx.lease_payments.updateMany({
          where: { lease_id: dup.id },
          data: { lease_id: canonical.id },
        })
        paymentsRepointed += updatedPayments.count

        // Delete duplicate lease
        await tx.leases.delete({
          where: { id: dup.id },
        })
      }
    })

    mergeLog.push({
      tenantName,
      roomNumber,
      beforeCount: leases.length,
      afterCount: 1,
      recordsRepointed,
      paymentsRepointed,
    })

    totalLeasesMerged += duplicates.length

    if (mergeLog.length <= 20) {
      // Print first 20 for visibility
      console.log(
        `  ${tenantName} / ${roomNumber}: ${leases.length} leases → 1 ` +
        `(re-pointed ${recordsRepointed} monthly_records, ${paymentsRepointed} payments)`
      )
    }
  }

  if (mergeLog.length > 20) {
    console.log(`  ... and ${mergeLog.length - 20} more groups`)
  }

  console.log(`\n  Total leases merged: ${totalLeasesMerged}`)

  // -------- AFTER COUNTS --------
  console.log('\n=== FINAL COUNTS (AFTER) ===\n')

  const afterLeases = await prisma.leases.count()
  const afterMonthlyRecords = await prisma.monthly_records.count()
  const afterPayments = await prisma.lease_payments.count()

  console.log(`Total leases:          ${afterLeases} (was ${beforeLeases}, removed ${beforeLeases - afterLeases})`)
  console.log(`Total monthly_records: ${afterMonthlyRecords} (was ${beforeMonthlyRecords}, MUST match)`)
  console.log(`Total lease_payments:  ${afterPayments} (was ${beforePayments}, MUST match)`)

  if (afterMonthlyRecords !== beforeMonthlyRecords) {
    console.log('\n⚠️  WARNING: monthly_records count changed! Should be unchanged.')
  }
  if (afterPayments !== beforePayments) {
    console.log('\n⚠️  WARNING: lease_payments count changed! Should be unchanged.')
  }

  const tayasAfterLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'TAYAS', mode: 'insensitive' } }
    }
  })
  const hhmAfterLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'HHM ELECTROMECHANICAL', mode: 'insensitive' } }
    }
  })
  const gulamLeases = await prisma.leases.count({
    where: {
      tenant: { full_name: { contains: 'Gulam Murtaza', mode: 'insensitive' } }
    }
  })
  const petraAfterLeases = await prisma.leases.count({
    where: {
      tenant: { company_name: { contains: 'Petra Oasis', mode: 'insensitive' } }
    }
  })

  console.log(`\nTayas leases:          ${tayasAfterLeases} (was ${tayasBeforeLeases}, expect ~25)`)
  console.log(`HHM leases:            ${hhmAfterLeases} (was ${hhmBeforeLeases}, expect ~12)`)
  console.log(`Gulam Murtaza leases:  ${gulamLeases} (expect ~4)`)
  console.log(`Petra Oasis leases:    ${petraAfterLeases} (was ${petraBeforeLeases}, should stay 9)`)

  // -------- VERIFY NO ORPHANS --------
  console.log('\n=== ORPHAN CHECK ===\n')

  const orphanedMonthlyRecords = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM monthly_records
    WHERE lease_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM leases WHERE leases.id = monthly_records.lease_id)
  `
  const orphanedPayments = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM lease_payments
    WHERE NOT EXISTS (SELECT 1 FROM leases WHERE leases.id = lease_payments.lease_id)
  `

  console.log(`Orphaned monthly_records: ${orphanedMonthlyRecords[0].count} (MUST be 0)`)
  console.log(`Orphaned lease_payments:  ${orphanedPayments[0].count} (MUST be 0)`)

  if (Number(orphanedMonthlyRecords[0].count) > 0) {
    console.log('\n❌ ERROR: Found orphaned monthly_records!')
  }
  if (Number(orphanedPayments[0].count) > 0) {
    console.log('\n❌ ERROR: Found orphaned lease_payments!')
  }

  if (Number(orphanedMonthlyRecords[0].count) === 0 && Number(orphanedPayments[0].count) === 0) {
    console.log('\n✅ No orphans detected - all foreign keys valid')
  }

  console.log('\n========================================')
  console.log('LEASE DEDUPLICATION COMPLETE')
  console.log('========================================\n')

  await prisma.$disconnect()
}

deduplicate().catch(err => {
  console.error('\n❌ DEDUPLICATION FAILED:', err)
  process.exit(1)
})
