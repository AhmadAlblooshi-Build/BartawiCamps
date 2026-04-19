// Camp 2 architectural layout — matches database structure
// Database format: zero-padded no-dash (A01, B14, BB06, U19, UU24)
//
// Ground floor: A, B, C, D, E, F + S (store) + U (retail)
// First floor:  AA, BB, CC, DD, EE, FF + SS + UU

export type FloorLevel = 'ground' | 'first'

export type RoomType =
  | 'standard'
  | 'bartawi'           // Bartawi Gen. Cont use
  | 'office'            // Camp Office
  | 'mosque'            // Prayer room
  | 'electricity'       // Electricity room
  | 'cleaners'          // Cleaners
  | 'store'             // Store/storage
  | 'retail'            // Commercial/retail unit
  | 'restaurant'        // Zaiqa Al Kebab etc.
  | 'legal'             // Active legal dispute (marked at runtime from remarks)

export interface RoomPosition {
  code: string
  x: number
  y: number
  width: number
  height: number
  type?: RoomType
  label?: string
}

export interface BlockLayout {
  code: string
  floor: FloorLevel
  skyX: number
  skyY: number
  skyWidth: number
  skyHeight: number
  rooms: RoomPosition[]
  labelX: number
  labelY: number
  category?: 'residential' | 'retail' | 'store'
}

export interface Facility {
  id: string
  type: 'corridor' | 'bath_room' | 'water_tank' | 'entrance'
  name: string
  x: number
  y: number
  width: number
  height: number
  floor?: FloorLevel | 'both'
}

const ROOM_WIDTH = 38
const ROOM_HEIGHT = 18
const CORRIDOR_WIDTH = 16

function generateBlockRooms(
  blockCode: string,
  roomCount: number,
  specialRooms: Partial<Record<string, { type: RoomType; label?: string }>> = {}
): RoomPosition[] {
  const rooms: RoomPosition[] = []
  const halfPoint = Math.ceil(roomCount / 2)
  const leftColumnCount = halfPoint
  const rightColumnCount = roomCount - halfPoint

  for (let i = 0; i < leftColumnCount; i++) {
    const roomNum = i + 1
    const code = `${blockCode}${String(roomNum).padStart(2, '0')}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: 0,
      y: 10 + i * (ROOM_HEIGHT + 1),
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      type: special?.type || 'standard',
      label: special?.label,
    })
  }

  for (let i = 0; i < rightColumnCount; i++) {
    const roomNum = roomCount - i
    const code = `${blockCode}${String(roomNum).padStart(2, '0')}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: ROOM_WIDTH + CORRIDOR_WIDTH,
      y: 10 + i * (ROOM_HEIGHT + 1),
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      type: special?.type || 'standard',
      label: special?.label,
    })
  }

  return rooms
}

function generateRetailStrip(
  blockCode: string,
  roomCount: number,
  specialRooms: Partial<Record<string, { type: RoomType; label?: string }>> = {}
): RoomPosition[] {
  const rooms: RoomPosition[] = []
  const halfPoint = Math.ceil(roomCount / 2)

  for (let i = 0; i < halfPoint; i++) {
    const roomNum = i + 1
    const code = `${blockCode}${String(roomNum).padStart(2, '0')}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: 0,
      y: 10 + i * 14,
      width: ROOM_WIDTH,
      height: 13,
      type: special?.type || 'retail',
      label: special?.label,
    })
  }

  for (let i = 0; i < roomCount - halfPoint; i++) {
    const roomNum = roomCount - i
    const code = `${blockCode}${String(roomNum).padStart(2, '0')}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: ROOM_WIDTH + CORRIDOR_WIDTH,
      y: 10 + i * 14,
      width: ROOM_WIDTH,
      height: 13,
      type: special?.type || 'retail',
      label: special?.label,
    })
  }

  return rooms
}

// Grid constants — 4 columns × 2 rows
const COL_1_X = 60
const COL_2_X = 260
const COL_3_X = 460
const COL_4_X = 660
const ROW_1_Y = 100
const ROW_2_Y = 400
const BLOCK_WIDTH = 170
const BLOCK_HEIGHT = 240
const BLOCK_HEIGHT_TALL = 300

// ============================================================================
// GROUND FLOOR BLOCKS
// ============================================================================

export const CAMP2_GROUND_FLOOR_BLOCKS: BlockLayout[] = [
  {
    code: 'A',
    floor: 'ground',
    skyX: COL_1_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_1_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('A', 5, {
      'A01': { type: 'electricity', label: 'Electricity Room' },
      'A04': { type: 'bartawi', label: 'Bartawi Use' },
      'A05': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'B',
    floor: 'ground',
    skyX: COL_2_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_2_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('B', 14),
  },
  {
    code: 'C',
    floor: 'ground',
    skyX: COL_3_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_3_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('C', 12, {
      'C08': { type: 'bartawi', label: 'Bartawi Use' },
      'C10': { type: 'bartawi', label: 'Bartawi Use' },
      'C12': { type: 'cleaners', label: 'Cleaners' },
    }),
  },
  {
    code: 'D',
    floor: 'ground',
    skyX: COL_4_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_4_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('D', 14),
  },
  {
    code: 'E',
    floor: 'ground',
    skyX: COL_1_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_1_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('E', 14, {
      'E02': { type: 'bartawi', label: 'Bartawi Use' },
      'E03': { type: 'bartawi', label: 'Bartawi Use' },
      'E14': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'F',
    floor: 'ground',
    skyX: COL_2_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_2_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('F', 5, {
      'F01': { type: 'office', label: 'Camp Office' },
    }),
  },
  {
    code: 'S',
    floor: 'ground',
    skyX: COL_3_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_3_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'store',
    rooms: generateBlockRooms('S', 1, {
      'S01': { type: 'restaurant', label: 'Zaiqa Al Kebab' },
    }),
  },
  {
    code: 'U',
    floor: 'ground',
    skyX: COL_4_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT_TALL,
    labelX: COL_4_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT_TALL / 2,
    category: 'retail',
    rooms: generateRetailStrip('U', 19, {
      'U13': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
]

// ============================================================================
// FIRST FLOOR BLOCKS
// ============================================================================

export const CAMP2_FIRST_FLOOR_BLOCKS: BlockLayout[] = [
  {
    code: 'AA',
    floor: 'first',
    skyX: COL_1_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_1_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('AA', 6, {
      'AA06': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'BB',
    floor: 'first',
    skyX: COL_2_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_2_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('BB', 14),
  },
  {
    code: 'CC',
    floor: 'first',
    skyX: COL_3_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_3_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('CC', 12, {
      'CC10': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'DD',
    floor: 'first',
    skyX: COL_4_X, skyY: ROW_1_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_4_X + BLOCK_WIDTH / 2, labelY: ROW_1_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('DD', 14, {
      'DD02': { type: 'bartawi', label: 'Bartawi Use' },
      'DD07': { type: 'bartawi', label: 'Bartawi Use' },
      'DD12': { type: 'bartawi', label: 'Bartawi Use' },
      'DD13': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'EE',
    floor: 'first',
    skyX: COL_1_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_1_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('EE', 14, {
      'EE01': { type: 'bartawi', label: 'Bartawi Use' },
      'EE05': { type: 'bartawi', label: 'Bartawi Use' },
      'EE06': { type: 'bartawi', label: 'Bartawi Use' },
      'EE07': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'FF',
    floor: 'first',
    skyX: COL_2_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_2_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'residential',
    rooms: generateBlockRooms('FF', 5, {
      'FF01': { type: 'mosque', label: 'Mosque' },
    }),
  },
  {
    code: 'SS',
    floor: 'first',
    skyX: COL_3_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT,
    labelX: COL_3_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT / 2,
    category: 'store',
    rooms: generateBlockRooms('SS', 6, {
      'SS01': { type: 'bartawi', label: 'Bartawi Use' },
      'SS04': { type: 'bartawi', label: 'Bartawi Use' },
      'SS05': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
  {
    code: 'UU',
    floor: 'first',
    skyX: COL_4_X, skyY: ROW_2_Y,
    skyWidth: BLOCK_WIDTH, skyHeight: BLOCK_HEIGHT_TALL,
    labelX: COL_4_X + BLOCK_WIDTH / 2, labelY: ROW_2_Y + BLOCK_HEIGHT_TALL / 2,
    category: 'retail',
    rooms: generateRetailStrip('UU', 24, {
      'UU10': { type: 'bartawi', label: 'Bartawi Use' },
    }),
  },
]

export const CAMP2_FACILITIES: Facility[] = []

export function getCamp2BlocksByFloor(floor: FloorLevel): BlockLayout[] {
  return floor === 'ground' ? CAMP2_GROUND_FLOOR_BLOCKS : CAMP2_FIRST_FLOOR_BLOCKS
}

export function getCamp2BlockByCode(code: string): BlockLayout | undefined {
  return [...CAMP2_GROUND_FLOOR_BLOCKS, ...CAMP2_FIRST_FLOOR_BLOCKS].find(b => b.code === code)
}

export function getAllCamp2BlockCodes(): string[] {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'S', 'U', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'SS', 'UU']
}
