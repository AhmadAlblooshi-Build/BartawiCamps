import { PrismaClient } from '@prisma/client'
import XLSX from 'xlsx'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const prisma = new PrismaClient()

const YEAR = 2026
const MONTH_MAP: Record<string, number> = {
  'January': 1,
  'Feburary': 2,   // Spreadsheet has this typo — keep as-is
  'February': 2,
  'March': 3,
}

interface SheetRow {
  Camp?: string
  'SR #'?: number
  Floor?: string
  'Old Room #'?: string
  'Room #'?: string
  'Room Type'?: string
  'People_Count'?: number | string
  Month?: string
  'Full Name'?: string
  'Company Name'?: string
  Rent?: number | string
  Paid?: number | string
  Balance?: number | string
  'Start Date'?: string | number
  'End Date'?: string | number
  Remarks?: string
}

function parseNumeric(val: any): number {
  if (val === null || val === undefined || val === '' || val === '0') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/,/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(val: any): Date | null {
  if (!val || val === '' || val === 0) return null
  try {
    // Excel sometimes returns dates as numbers (days since 1900)
    if (typeof val === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1899, 11, 30)
      const d = new Date(excelEpoch.getTime() + val * 86400000)
      return isNaN(d.getTime()) ? null : d
    }
    const str = String(val).trim()
    const cleaned = str.replace(/ 0:00:00$/, '').replace(/ 00:00:00$/, '')
    const d = new Date(cleaned)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function inferRoomType(roomType: string, tenant: string): string {
  const t = (tenant || '').toLowerCase()
  const rt = (roomType || '').toLowerCase()

  if (t.includes('bartawi') || t.includes('camp office') || t.includes('camp boss') ||
      t.includes('security') || t.includes('cleaners') || t.includes('electricity') ||
      t.includes('mosque') || t.includes('bgc')) {
    return 'Bartawi Room'
  }

  if (rt.includes('yearly')) return 'Yearly'
  if (rt.includes('monthly')) return 'Monthly'

  return 'Rented'
}

function isCompanyTenant(name: string): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  const companyKeywords = [
    'llc', 'co.', 'company', 'contracting', 'trading', 'technical',
    'services', 'industries', 'ltd', 'enterprises', 'oasis', 'truck',
    'petra', 'tayas', 'hhm', 'mizna', 'phoenix', 'falcon', 'venus',
    'zakum', 'shwifat', 'zaika', 'zaiqa', 'jubily', 'supermarket',
    'restaurant', 'blue ginger', 'czar', 'olive star', 'm.b.k',
    'mbk', 'rithi', 'ana interior', 'cool wood', 'hashim darwish',
    'al hayat', 'al naami', 'bait al', 'reno space', 'ambigram',
    'favourite plus', 'favorite plus', 'new phoenix', 'jelnar',
    'gbt golden', 'mindmap', 'advance aluminium', 'advanced aluminium',
    'gulf fidelity', '800 truck', 'malik', 'jadar', 'shahid ali',
    'jamshed', 'pristine', 'cyana', 'zaykaa', 'jubli', 'raja jeev',
    'rajajeev',
  ]
  return companyKeywords.some(kw => n.includes(kw))
}

async function seedCamp2() {
  const filePath = path.join(__dirname, '..', 'seed-data', 'Camp_Final.xlsx')
  console.log('Reading spreadsheet from:', filePath)

  const workbook = XLSX.readFile(filePath)

  // Find the Camp 2 camp record
  const camp2 = await prisma.camps.findFirst({
    where: {
      OR: [
        { code: 'CAMP-02' },
        { code: 'CAMP-2' },
        { code: 'C2' },
        { name: { contains: 'Camp 2', mode: 'insensitive' } },
      ],
    },
  })

  if (!camp2) {
    throw new Error('Camp 2 record not found in camps table. Create it first.')
  }

  console.log(`Found Camp 2: id=${camp2.id}`)

  // Collect all rows across sheets
  const allRows: SheetRow[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null })
    allRows.push(...rows)
  }

  // Filter to Camp 2 rows only
  const camp2Rows = allRows.filter(r => {
    const camp = (r.Camp || '').toString().trim()
    return camp === 'Camp 2' || camp.includes('Camp 2')
  })

  console.log(`Found ${camp2Rows.length} Camp 2 rows`)

  // Group by room_number to first create rooms, then records
  const roomMap = new Map<string, {
    roomNumber: string
    floor: 'ground' | 'first'
    roomType: string
    maxCapacity: number
    blockCode: string
  }>()

  for (const row of camp2Rows) {
    const roomNumber = (row['Room #'] || '').toString().trim()
    if (!roomNumber) continue

    // Infer block code from room_number (e.g., "UU24" → "UU", "A01" → "A", "BB06" → "BB", "S01" → "S")
    const blockCode = roomNumber.match(/^([A-Z]+)/)?.[1] || ''
    if (!blockCode) continue

    // Floor: first floor blocks have double letters (AA, BB, CC, DD, EE, FF, SS, UU)
    const floor: 'ground' | 'first' = blockCode.length === 2 && blockCode[0] === blockCode[1]
      ? 'first'
      : 'ground'

    const people = parseNumeric(row['People_Count'])
    const tenant = (row['Company Name'] || row['Full Name'] || '').toString().trim()
    const roomType = inferRoomType(
      (row['Room Type'] || '').toString(),
      tenant
    )

    // Max capacity — track the max seen across months
    const existing = roomMap.get(roomNumber)
    if (!existing) {
      roomMap.set(roomNumber, {
        roomNumber,
        floor,
        roomType,
        maxCapacity: Math.max(people, 8),  // default 8 min
        blockCode,
      })
    } else {
      existing.maxCapacity = Math.max(existing.maxCapacity, people)
    }
  }

  console.log(`Unique rooms to create: ${roomMap.size}`)

  // Get all unique block codes and ensure blocks exist
  const blockCodes = new Set<string>()
  for (const room of roomMap.values()) {
    blockCodes.add(room.blockCode)
  }

  const blockMap = new Map<string, string>()  // blockCode → blockId

  for (const code of blockCodes) {
    const floor: 'ground' | 'first' = code.length === 2 && code[0] === code[1] ? 'first' : 'ground'
    const floorLabel = floor === 'ground' ? 'Ground' : 'First'

    let block = await prisma.blocks.findFirst({
      where: { camp_id: camp2.id, code },
    })

    if (!block) {
      block = await prisma.blocks.create({
        data: {
          camp_id: camp2.id,
          code,
          floor_label: floorLabel,
        },
      })
      console.log(`Created block ${code} (${floorLabel})`)
    }

    blockMap.set(code, block.id)
  }

  // Create rooms
  let roomsCreated = 0
  let roomsSkipped = 0
  const roomIdMap = new Map<string, string>()  // roomNumber → roomId

  for (const room of roomMap.values()) {
    const blockId = blockMap.get(room.blockCode)
    if (!blockId) {
      roomsSkipped++
      continue
    }

    let dbRoom = await prisma.rooms.findFirst({
      where: {
        camp_id: camp2.id,
        room_number: room.roomNumber,
      },
    })

    if (!dbRoom) {
      dbRoom = await prisma.rooms.create({
        data: {
          camp_id: camp2.id,
          block_id: blockId,
          room_number: room.roomNumber,
          status: 'occupied',  // default; will be overridden by records
          room_size: 'standard',
          standard_rent: 0,  // no standard rent concept for Camp 2 (varies wildly)
          max_capacity: room.maxCapacity,
          property_type: room.roomType,
        },
      })
      roomsCreated++
    }

    roomIdMap.set(room.roomNumber, dbRoom.id)
  }

  console.log(`Rooms created: ${roomsCreated}, skipped: ${roomsSkipped}`)

  // Create monthly_records
  let recordsCreated = 0
  let recordsUpdated = 0
  let recordsSkipped = 0

  for (const row of camp2Rows) {
    const roomNumber = (row['Room #'] || '').toString().trim()
    const monthStr = (row.Month || '').toString().trim()
    const month = MONTH_MAP[monthStr]
    if (!roomNumber || !month) {
      recordsSkipped++
      continue
    }

    const roomId = roomIdMap.get(roomNumber)
    if (!roomId) {
      recordsSkipped++
      continue
    }

    const rent = parseNumeric(row.Rent)
    const paid = parseNumeric(row.Paid)
    const balance = parseNumeric(row.Balance) || Math.max(0, rent - paid)
    const tenantRaw = (row['Company Name'] || row['Full Name'] || '').toString().trim()
    const peopleCount = parseNumeric(row['People_Count']) || 0
    const remarks = (row.Remarks || '').toString().trim() || null
    const contractType = (row['Room Type'] || '').toString().trim() || null
    const contractStart = parseDate(row['Start Date'])
    const contractEnd = parseDate(row['End Date'])

    // Decide company vs individual
    const isCompany = isCompanyTenant(tenantRaw)
    const ownerName = !isCompany && tenantRaw ? tenantRaw : null
    const companyName = isCompany ? tenantRaw : null

    const existing = await prisma.monthly_records.findUnique({
      where: {
        room_id_month_year: {
          room_id: roomId,
          month,
          year: YEAR,
        },
      },
    })

    const data = {
      room_id: roomId,
      camp_id: camp2.id,
      month,
      year: YEAR,
      rent,
      paid,
      owner_name: ownerName,
      company_name: companyName,
      contract_type: contractType,
      people_count: peopleCount,
      remarks,
      contract_start_date: contractStart,
      contract_end_date: contractEnd,
    }

    if (existing) {
      await prisma.monthly_records.update({
        where: { id: existing.id },
        data,
      })
      recordsUpdated++
    } else {
      await prisma.monthly_records.create({ data })
      recordsCreated++
    }
  }

  console.log(`\nMonthly records: ${recordsCreated} created, ${recordsUpdated} updated, ${recordsSkipped} skipped`)
  console.log('\nCamp 2 seed complete.')

  await prisma.$disconnect()
}

seedCamp2().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
