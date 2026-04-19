import fetch from 'node-fetch'

const CAMP_ID = '4c935f2b-23b9-b94c-99ca-cb2ee0620045'
const API_URL = `http://localhost:3001/api/v1/rooms?camp_id=${CAMP_ID}&limit=500`

async function check() {
  try {
    const response = await fetch(API_URL)

    if (response.status === 401) {
      console.log('API requires auth - using direct DB query instead...\n')

      // Test synthesis logic directly with Prisma
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const now = new Date()
      const currentMonthNum = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const MONTH_NAMES = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]

      const room = await prisma.rooms.findFirst({
        where: { room_number: 'B01' },
        include: {
          room_occupancy: {
            where: { is_current: true },
            take: 1,
          },
          monthly_records: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 12,
          },
        },
      })

      if (!room) {
        console.log('B01 not found')
        await prisma.$disconnect()
        return
      }

      // Apply the same synthesis logic as the API
      const sortedRecords = room.monthly_records.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })

      let currentMonth = sortedRecords.find(r =>
        r.month === currentMonthNum && r.year === currentYear
      )

      if (!currentMonth) {
        const mostRecent = sortedRecords[0]
        const hasRecentTenant = !!(mostRecent && (mostRecent.owner_name || mostRecent.company_name))
        const hasOccupancyRow = !!(room.room_occupancy && room.room_occupancy.length > 0)
        const isOccupied = hasRecentTenant || hasOccupancyRow

        console.log('Synthesis Check:')
        console.log('  hasRecentTenant:', hasRecentTenant)
        console.log('  mostRecent tenant:', mostRecent?.owner_name || mostRecent?.company_name)
        console.log('  hasOccupancyRow:', hasOccupancyRow)
        console.log('  isOccupied:', isOccupied)
        console.log()

        if (isOccupied) {
          const contractType = (mostRecent?.contract_type || '').toString().toLowerCase()
          const tenant = (mostRecent?.owner_name || mostRecent?.company_name || '').toString().toLowerCase()
          const bartawiKeywords = [
            'bartawi', 'bgc', 'camp boss', 'camp office', 'security room',
            'cleaners', 'mosque', 'bgc room', 'electricity room',
          ]
          const isBartawi =
            contractType.includes('bartawi') ||
            bartawiKeywords.some(kw => tenant.includes(kw)) ||
            (mostRecent && Number(mostRecent.rent) === 0)

          if (!isBartawi) {
            let inferredRent = 0
            for (const rec of sortedRecords) {
              const rnum = Number(rec.rent) || 0
              if (rnum > 0) {
                inferredRent = rnum
                break
              }
            }
            if (inferredRent === 0) {
              inferredRent = Number(room.standard_rent) || 0
            }

            if (inferredRent > 0) {
              currentMonth = {
                month: currentMonthNum,
                month_name: MONTH_NAMES[currentMonthNum],
                year: currentYear,
                rent: inferredRent,
                paid: 0,
                balance: inferredRent,
                remarks: `Rent for ${MONTH_NAMES[currentMonthNum]} ${currentYear} not yet recorded`,
                owner_name: mostRecent?.owner_name || null,
                company_name: mostRecent?.company_name || null,
                contract_type: mostRecent?.contract_type || null,
                people_count: mostRecent?.people_count || 0,
                is_locked: false,
                is_synthesized: true,
              }
            }
          }
        }
      }

      console.log('B-01 current_month:')
      console.log(JSON.stringify(currentMonth, null, 2))

      await prisma.$disconnect()
    } else {
      const json = await response.json()
      const b01 = json.data?.find(r => r.room_number === 'B01')

      if (b01) {
        console.log('B-01 current_month:')
        console.log(JSON.stringify(b01.current_month, null, 2))
      } else {
        console.log('B01 not found in response')
      }
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

check()
