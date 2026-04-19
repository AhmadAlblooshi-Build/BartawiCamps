// Camp 1 architectural layout — coordinates derived from
// CAMP-01 UPDATED DRAWING JAN-22-2026.pdf
//
// Coordinate system: SVG viewBox 0 0 1000 800
//   - Origin (0,0) is top-left
//   - North is at top (y=0), South at bottom (y=800)
//   - West is at left (x=0), East at right (x=1000)
//
// All dimensions are proportional to the actual drawing.
// Block room arrangement: two columns per block
//   - Left column (west side): rooms 1-11 reading top-to-bottom
//   - Right column (east side): rooms N-N+10 reading top-to-bottom
//   - Extra rooms (B-23, B-24, etc.) at the south end

export type FloorLevel = 'ground' | 'first'

export interface RoomPosition {
  code: string          // e.g. "A-1" (matches database room_number format)
  x: number             // x offset within block (0 = left edge)
  y: number             // y offset within block (0 = top edge)
  width: number         // room width in layout units
  height: number        // room height in layout units
  type?: 'standard' | 'bartawi' | 'office' | 'security' | 'cleaners' | 'restaurant'
  label?: string        // optional override label (e.g. "OFFICE" for D-1)
}

export interface BlockLayout {
  code: string          // e.g. "A"
  floor: FloorLevel
  // Position in sky view (SVG coords)
  skyX: number
  skyY: number
  skyWidth: number
  skyHeight: number
  // Rooms within this block (coords are relative to block, not sky)
  rooms: RoomPosition[]
  // Block's own center point (for label placement in sky view)
  labelX: number
  labelY: number
}

export interface Facility {
  id: string
  type: 'retail' | 'bus_stop' | 'security_room' | 'mosque' | 'kitchen_corridor' | 'substation' | 'gas_room' | 'pump_room' | 'water_tank' | 'store' | 'ac_room' | 'office' | 'road' | 'fence'
  name: string
  x: number
  y: number
  width: number
  height: number
  floor?: FloorLevel | 'both'  // some facilities are ground floor only
}

// ============================================================================
// BLOCK DIMENSIONS (consistent across all blocks)
// ============================================================================
// Each block is ~11m wide × 26m deep in real life
// In layout units: 100 wide × 240 tall
// Each block has 22-24 rooms in two columns

const BLOCK_WIDTH = 100
const BLOCK_HEIGHT = 240
const ROOM_WIDTH = 38          // two columns, ~38 wide each + 24 corridor
const ROOM_HEIGHT = 20         // each room ~20 tall (11 rooms fit in 220 = 11 × 20)
const CORRIDOR_WIDTH = 24      // middle corridor with toilets/baths

// Helper to generate rooms for a standard block (22 rooms, two columns of 11)
function generateStandardBlock(
  blockCode: string,
  specialRooms: Partial<Record<string, { type: RoomPosition['type']; label?: string }>> = {}
): RoomPosition[] {
  const rooms: RoomPosition[] = []

  // Left column (rooms 1-11 reading top to bottom)
  for (let i = 0; i < 11; i++) {
    const roomNum = i + 1
    const code = `${blockCode}-${roomNum}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: 0,
      y: 10 + i * (ROOM_HEIGHT + 0.8),
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      type: special?.type || 'standard',
      label: special?.label,
    })
  }

  // Right column (rooms N-N+10 reading top to bottom, where N = 22 for 22-room block)
  for (let i = 0; i < 11; i++) {
    const roomNum = 22 - i  // 22, 21, 20, ..., 12
    const code = `${blockCode}-${roomNum}`
    const special = specialRooms[code]
    rooms.push({
      code,
      x: ROOM_WIDTH + CORRIDOR_WIDTH,
      y: 10 + i * (ROOM_HEIGHT + 0.8),
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      type: special?.type || 'standard',
      label: special?.label,
    })
  }

  return rooms
}

// For blocks with extra rooms at the south end (B-23, B-24, D-23, E-23, E-24)
function generateBlockWithExtras(
  blockCode: string,
  extras: string[],
  specialRooms: Partial<Record<string, { type: RoomPosition['type']; label?: string }>> = {}
): RoomPosition[] {
  const rooms = generateStandardBlock(blockCode, specialRooms)
  // Add extras at the south end
  extras.forEach((code, i) => {
    const special = specialRooms[code]
    rooms.push({
      code,
      x: i < extras.length / 2 ? 0 : ROOM_WIDTH + CORRIDOR_WIDTH,
      y: 235 + Math.floor(i / 2) * (ROOM_HEIGHT + 0.8),
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      type: special?.type || 'standard',
      label: special?.label,
    })
  })
  return rooms
}

// ============================================================================
// GROUND FLOOR BLOCKS — Row 1 (A, B, C) and Row 2 (D, E, F)
// ============================================================================

// Y coordinates for the two rows
const ROW1_Y = 120        // Row 1 starts below retail strip + bus stop
const ROW2_Y = 440        // Row 2 starts below kitchen corridor

// X coordinates for the three columns (west, center, east)
const COL_WEST_X = 80
const COL_CENTER_X = 320
const COL_EAST_X = 560

export const GROUND_FLOOR_BLOCKS: BlockLayout[] = [
  {
    code: 'A',
    floor: 'ground',
    skyX: COL_WEST_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_WEST_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('A', {
      'A-17': { type: 'bartawi', label: 'Camp Boss' },
      'A-18': { type: 'bartawi', label: 'BGC Room' },
      'A-19': { type: 'bartawi', label: 'BGC Room' },
    }),
  },
  {
    code: 'B',
    floor: 'ground',
    skyX: COL_CENTER_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 40,  // taller due to B-23, B-24 extras
    labelX: COL_CENTER_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('B', ['B-23', 'B-24']),
  },
  {
    code: 'C',
    floor: 'ground',
    skyX: COL_EAST_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_EAST_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('C', {
      'C-11': { type: 'cleaners', label: 'Cleaners' },
      'C-20': { type: 'security', label: 'Security Room' },
    }),
  },
  {
    code: 'D',
    floor: 'ground',
    skyX: COL_WEST_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 20,  // taller due to D-23
    labelX: COL_WEST_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('D', ['D-23'], {
      'D-1': { type: 'office', label: 'Camp Office' },
      'D-6': { type: 'restaurant', label: 'Kabul City Rest.' },
    }),
  },
  {
    code: 'E',
    floor: 'ground',
    skyX: COL_CENTER_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 40,  // taller due to E-23, E-24
    labelX: COL_CENTER_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('E', ['E-23', 'E-24']),
  },
  {
    code: 'F',
    floor: 'ground',
    skyX: COL_EAST_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_EAST_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('F'),
  },
]

// ============================================================================
// FIRST FLOOR BLOCKS — AA, BB, CC, DD, EE, FF
// Same positions as ground floor but with different block codes
// ============================================================================

export const FIRST_FLOOR_BLOCKS: BlockLayout[] = [
  {
    code: 'AA',
    floor: 'first',
    skyX: COL_WEST_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_WEST_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('AA'),
  },
  {
    code: 'BB',
    floor: 'first',
    skyX: COL_CENTER_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 40,
    labelX: COL_CENTER_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('BB', ['BB-23', 'BB-24']),
  },
  {
    code: 'CC',
    floor: 'first',
    skyX: COL_EAST_X,
    skyY: ROW1_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_EAST_X + BLOCK_WIDTH / 2,
    labelY: ROW1_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('CC'),
  },
  {
    code: 'DD',
    floor: 'first',
    skyX: COL_WEST_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 20,
    labelX: COL_WEST_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('DD', ['DD-23']),
  },
  {
    code: 'EE',
    floor: 'first',
    skyX: COL_CENTER_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT + 40,
    labelX: COL_CENTER_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateBlockWithExtras('EE', ['EE-23', 'EE-24']),
  },
  {
    code: 'FF',
    floor: 'first',
    skyX: COL_EAST_X,
    skyY: ROW2_Y,
    skyWidth: BLOCK_WIDTH,
    skyHeight: BLOCK_HEIGHT,
    labelX: COL_EAST_X + BLOCK_WIDTH / 2,
    labelY: ROW2_Y + BLOCK_HEIGHT / 2,
    rooms: generateStandardBlock('FF'),
  },
]

// ============================================================================
// FACILITIES (retail strip, mosque, bus stop, etc.)
// ============================================================================

export const CAMP1_FACILITIES: Facility[] = [
  // Retail strip along north edge (ground floor only — but visible on both)
  { id: 'shaklan', type: 'retail', name: 'Shaklan Super Market',    x: 80,  y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'tayn',    type: 'retail', name: 'Tayn Nuts & Spices',      x: 170, y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'desi',    type: 'retail', name: 'Slick Desi Cuts',         x: 260, y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'helal',   type: 'retail', name: 'Fly Helal Travel',        x: 350, y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'topcity', type: 'retail', name: 'Top City',                x: 440, y: 40, width: 60, height: 40, floor: 'both' },
  { id: 'avays',   type: 'retail', name: 'Avays Lunch Break',       x: 510, y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'telex',   type: 'retail', name: 'Telex Electronics',       x: 600, y: 40, width: 80, height: 40, floor: 'both' },
  { id: 'pharm',   type: 'retail', name: 'Pharmacy',                x: 690, y: 40, width: 60, height: 40, floor: 'both' },
  { id: 'cafe',    type: 'retail', name: 'Cafeteria',               x: 760, y: 40, width: 80, height: 40, floor: 'both' },

  // Bus stop and security room at front entrance
  { id: 'bus',  type: 'bus_stop',      name: 'Bus Stop',      x: 20,  y: 90, width: 50, height: 25, floor: 'both' },
  { id: 'sec',  type: 'security_room', name: 'Security Room', x: 860, y: 90, width: 80, height: 25, floor: 'both' },

  // Kitchen/dining corridor between rows
  { id: 'kitchen', type: 'kitchen_corridor', name: 'Kitchen · Dining · Toilets', x: 80, y: 380, width: 780, height: 50, floor: 'both' },

  // Mosque adjacent to Block E (east side)
  { id: 'mosque', type: 'mosque', name: 'Mosque', x: 440, y: 550, width: 60, height: 50, floor: 'both' },

  // Substations (two flanking the retail strip)
  { id: 'sub1', type: 'substation', name: 'Substation', x: 15,  y: 45, width: 20, height: 30, floor: 'ground' },
  { id: 'sub2', type: 'substation', name: 'Substation', x: 840, y: 45, width: 20, height: 30, floor: 'ground' },

  // Utility rooms in corridor
  { id: 'gas',   type: 'gas_room',   name: 'Gas Room',    x: 240, y: 390, width: 60, height: 30, floor: 'ground' },
  { id: 'pump',  type: 'pump_room',  name: 'Pump Room',   x: 680, y: 390, width: 60, height: 30, floor: 'ground' },
  { id: 'water', type: 'water_tank', name: 'Water Tank',  x: 560, y: 390, width: 60, height: 30, floor: 'ground' },

  // Storage
  { id: 'store1', type: 'store',   name: 'Store-01',  x: 15, y: 700, width: 40, height: 30, floor: 'ground' },
  { id: 'store2', type: 'store',   name: 'Store-02',  x: 60, y: 700, width: 40, height: 30, floor: 'ground' },
  { id: 'ac',     type: 'ac_room', name: 'AC Room',   x: 110, y: 700, width: 40, height: 30, floor: 'ground' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getBlocksByFloor(floor: FloorLevel): BlockLayout[] {
  return floor === 'ground' ? GROUND_FLOOR_BLOCKS : FIRST_FLOOR_BLOCKS
}

export function getBlockByCode(code: string): BlockLayout | undefined {
  return [...GROUND_FLOOR_BLOCKS, ...FIRST_FLOOR_BLOCKS].find(b => b.code === code)
}

export function getRoomPosition(blockCode: string, roomCode: string): RoomPosition | undefined {
  const block = getBlockByCode(blockCode)
  return block?.rooms.find(r => r.code === roomCode)
}

export function getAllBlockCodes(): string[] {
  return [
    'A', 'B', 'C', 'D', 'E', 'F',
    'AA', 'BB', 'CC', 'DD', 'EE', 'FF',
  ]
}

// Check if a room has a special Bartawi use (for styling)
export function isBartawiRoom(roomCode: string): boolean {
  const bartawiRooms = [
    'A-17', 'A-18', 'A-19',  // Camp Boss, BGC rooms
    'C-11', 'C-20',           // Cleaners, Security
    'D-1',                    // Camp Office
  ]
  return bartawiRooms.includes(roomCode)
}
