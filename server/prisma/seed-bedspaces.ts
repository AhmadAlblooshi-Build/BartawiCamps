import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BARTAWI_TENANT_ID = 'a17e9d40-a011-a14e-0b0e-67b0a0dbc71f'

/**
 * Extract bed count from a room.
 * Priority: explicit bed_count column > max_capacity > default 1
 */
function getBedCount(room: any): number {
  // Explicit bed_count column check
  if (typeof room.bed_count === 'number' && room.bed_count > 0) {
    return room.bed_count
  }

  // Use max_capacity
  if (typeof room.max_capacity === 'number' && room.max_capacity > 0) {
    return room.max_capacity
  }

  // Check property_type for patterns like "12 beds room"
  const pt = typeof room.property_type === 'object'
    ? room.property_type?.name || ''
    : room.property_type || ''
  const ptStr = String(pt).toLowerCase()

  // Bartawi service rooms — no bed-level leasing
  if (ptStr.includes('bartawi') || ptStr.includes('service') || ptStr.includes('office')) {
    return 0
  }

  // Match "12 beds", "8 bed", etc.
  const match = ptStr.match(/(\d+)\s*bed/)
  if (match) return parseInt(match[1], 10)

  // Fallback: assume 1 bed
  return 1
}

async function main() {
  console.log('Seeding bedspaces from existing rooms...\n')

  const rooms = await prisma.rooms.findMany({
    where: {
      camps: { tenant_id: BARTAWI_TENANT_ID },
    },
    include: {
      bedspaces: true,
      property_types: true,
    },
  })

  let totalRooms = 0
  let skippedBartawi = 0
  let skippedAlreadySeeded = 0
  let createdBedspaces = 0

  for (const room of rooms) {
    totalRooms++
    const bedCount = getBedCount(room)

    if (bedCount === 0) {
      skippedBartawi++
      console.log(`  Skipped ${room.room_number} (Bartawi/service room)`)
      continue
    }

    // Idempotent — skip if room already has bedspaces
    if (room.bedspaces && room.bedspaces.length > 0) {
      skippedAlreadySeeded++
      console.log(`  Skipped ${room.room_number} (already has ${room.bedspaces.length} bedspaces)`)
      continue
    }

    // Create N bedspaces for this room
    console.log(`  Creating ${bedCount} bedspaces for ${room.room_number}...`)
    for (let bedNum = 1; bedNum <= bedCount; bedNum++) {
      await prisma.bedspaces.create({
        data: {
          tenant_id: BARTAWI_TENANT_ID,
          room_id: room.id,
          bed_number: bedNum,
          capacity: 1,
          is_active: true,
        },
      })
      createdBedspaces++
    }
  }

  console.log(`
Summary:
  Rooms processed:        ${totalRooms}
  Bartawi skipped:        ${skippedBartawi}
  Already-seeded skipped: ${skippedAlreadySeeded}
  Bedspaces created:      ${createdBedspaces}
  `)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
