import fetch from 'node-fetch'

const CAMP_ID = '4c935f2b-23b9-b94c-99ca-cb2ee0620045'
const API_URL = `http://localhost:3001/api/v1/rooms?camp_id=${CAMP_ID}&limit=500`

async function test() {
  try {
    const response = await fetch(API_URL)
    const json = await response.json()

    console.log('Response status:', response.status)
    console.log('Response keys:', Object.keys(json))

    if (json.error) {
      console.log('❌ API Error:', json.error)
      console.log('\nAPI requires authentication. Testing via Prisma instead...\n')

      // Direct DB query
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const b01 = await prisma.rooms.findFirst({
        where: { room_number: 'B01' },
        include: {
          room_occupancy: {
            where: { is_current: true },
            take: 1,
          },
          monthly_records: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 3,
          },
        },
      })

      if (!b01) {
        console.log('❌ B01 not found in DB')
        await prisma.$disconnect()
        return
      }

      console.log('✅ B01 found in DB')
      console.log('\nroom_occupancy:', b01.room_occupancy.length > 0 ? 'EXISTS' : 'NULL')
      console.log('monthly_records count:', b01.monthly_records.length)
      console.log('\nmonthly_records (recent 3):')
      b01.monthly_records.forEach(r => {
        console.log(`  ${r.year}-${String(r.month).padStart(2, '0')}: rent=${r.rent}, paid=${r.paid}, balance=${r.balance}`)
      })

      await prisma.$disconnect()
      return
    }

    const b01 = json.data.find(r => r.room_number === 'B01')

    if (!b01) {
      console.log('❌ B01 not found')
      return
    }

    console.log(JSON.stringify({
      current_month: b01.current_month,
      current_occupancy: b01.current_occupancy ? {
        id: b01.current_occupancy.id,
        people_count: b01.current_occupancy.people_count,
      } : null,
      monthly_records_count: b01.monthly_records?.length || 0,
    }, null, 2))
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.error(err.stack)
  }
}

test()
