// CAMP 1 ARCHITECTURAL LAYOUT DATA
// Source: CAMP-01 JAN-22-2026.pdf architectural drawing
// This is the source of truth for Camp 1 block positions and room numbers

export interface BlockDefinition {
  code: string
  floor: 'ground' | 'first'
  label: string
  rooms: string[]          // room numbers in display order
  extraRooms?: string[]    // rooms 23, 24 etc.
  position: {              // relative position in the camp SVG (percentage-based)
    row: number            // 0 = top row, 1 = bottom row
    col: number            // 0 = left, 1 = middle, 2 = right
  }
  facilities?: string[]    // adjacent facilities (mosque, office, etc.)
}

export const CAMP1_GROUND_BLOCKS: BlockDefinition[] = [
  {
    code: 'A', floor: 'ground', label: 'Block A',
    rooms: ['A-1','A-2','A-3','A-4','A-5','A-6','A-7','A-8','A-9','A-10','A-11',
            'A-22','A-21','A-20','A-19','A-18','A-17','A-16','A-15','A-14','A-13','A-12'],
    position: { row: 0, col: 0 },
  },
  {
    code: 'B', floor: 'ground', label: 'Block B',
    rooms: ['B-1','B-2','B-3','B-4','B-5','B-6','B-7','B-8','B-9','B-10','B-11',
            'B-22','B-21','B-20','B-19','B-18','B-17','B-16','B-15','B-14','B-13','B-12'],
    extraRooms: ['B-23', 'B-24'],
    position: { row: 0, col: 1 },
  },
  {
    code: 'C', floor: 'ground', label: 'Block C',
    rooms: ['C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10','C-11',
            'C-22','C-21','C-20','C-19','C-18','C-17','C-16','C-15','C-14','C-13','C-12'],
    position: { row: 0, col: 2 },
  },
  {
    code: 'D', floor: 'ground', label: 'Block D',
    rooms: ['D-1','D-2','D-3','D-4','D-5','D-6','D-7','D-8','D-9','D-10','D-11',
            'D-22','D-21','D-20','D-19','D-18','D-17','D-16','D-15','D-14','D-13','D-12'],
    extraRooms: ['D-23'],
    position: { row: 1, col: 0 },
    facilities: ['Office (D-1 area)'],
  },
  {
    code: 'E', floor: 'ground', label: 'Block E',
    rooms: ['E-1','E-2','E-3','E-4','E-5','E-6','E-7','E-8','E-9','E-10','E-11',
            'E-22','E-21','E-20','E-19','E-18','E-17','E-16','E-15','E-14','E-13','E-12'],
    extraRooms: ['E-23', 'E-24'],
    position: { row: 1, col: 1 },
    facilities: ['Mosque (adjacent, between E-3/E-4)'],
  },
  {
    code: 'F', floor: 'ground', label: 'Block F',
    rooms: ['F-1','F-2','F-3','F-4','F-5','F-6','F-7','F-8','F-9','F-10','F-11',
            'F-22','F-21','F-20','F-19','F-18','F-17','F-16','F-15','F-14','F-13','F-12'],
    position: { row: 1, col: 2 },
  },
]

export const CAMP1_FIRST_BLOCKS: BlockDefinition[] = [
  {
    code: 'AA', floor: 'first', label: 'Block AA',
    rooms: ['AA-1','AA-2','AA-3','AA-4','AA-5','AA-6','AA-7','AA-8','AA-9','AA-10','AA-11',
            'AA-22','AA-21','AA-20','AA-19','AA-18','AA-17','AA-16','AA-15','AA-14','AA-13','AA-12'],
    position: { row: 0, col: 0 },
  },
  {
    code: 'BB', floor: 'first', label: 'Block BB',
    rooms: ['BB-1','BB-2','BB-3','BB-4','BB-5','BB-6','BB-7','BB-8','BB-9','BB-10','BB-11',
            'BB-22','BB-21','BB-20','BB-19','BB-18','BB-17','BB-16','BB-15','BB-14','BB-13','BB-12'],
    extraRooms: ['BB-23', 'BB-24'],
    position: { row: 0, col: 1 },
  },
  {
    code: 'CC', floor: 'first', label: 'Block CC',
    rooms: ['CC-1','CC-2','CC-3','CC-4','CC-5','CC-6','CC-7','CC-8','CC-9','CC-10','CC-11',
            'CC-22','CC-21','CC-20','CC-19','CC-18','CC-17','CC-16','CC-15','CC-14','CC-13','CC-12'],
    position: { row: 0, col: 2 },
  },
  {
    code: 'DD', floor: 'first', label: 'Block DD',
    rooms: ['DD-1','DD-2','DD-3','DD-4','DD-5','DD-6','DD-7','DD-8','DD-9','DD-10','DD-11',
            'DD-22','DD-21','DD-20','DD-19','DD-18','DD-17','DD-16','DD-15','DD-14','DD-13','DD-12'],
    extraRooms: ['DD-23'],
    position: { row: 1, col: 0 },
  },
  {
    code: 'EE', floor: 'first', label: 'Block EE',
    rooms: ['EE-1','EE-2','EE-3','EE-4','EE-5','EE-6','EE-7','EE-8','EE-9','EE-10','EE-11',
            'EE-22','EE-21','EE-20','EE-19','EE-18','EE-17','EE-16','EE-15','EE-14','EE-13','EE-12'],
    extraRooms: ['EE-23', 'EE-24'],
    position: { row: 1, col: 1 },
  },
  {
    code: 'FF', floor: 'first', label: 'Block FF',
    rooms: ['FF-1','FF-2','FF-3','FF-4','FF-5','FF-6','FF-7','FF-8','FF-9','FF-10','FF-11',
            'FF-22','FF-21','FF-20','FF-19','FF-18','FF-17','FF-16','FF-15','FF-14','FF-13','FF-12'],
    position: { row: 1, col: 2 },
  },
]

export const CAMP1_FACILITIES = {
  retailStrip: [
    'Shaklan Super Market', 'Tayn Nuts & Spices', 'Slick Desi Cuts',
    'Gents Salon', 'Fly Helal Travel', 'Top City',
    'Avays Lunch Break', 'Telex Electronics', 'Pharmacy', 'Cafeteria'
  ],
  landmarks: [
    { type: 'mosque', label: 'Mosque', position: 'between Block E rows, near E-3/E-4' },
    { type: 'bus_stop', label: 'Bus Stop', position: 'north, front entrance' },
    { type: 'security', label: 'Security Room', position: 'north-east, front entrance' },
    { type: 'kitchen', label: 'Kitchen / Dining', position: 'central corridor between row 0 and row 1' },
    { type: 'office', label: 'Office', position: 'Block D area' },
  ],
  infrastructure: [
    'Water Tank (3)', 'Substation (2)', 'AC Room', 'Gas Room',
    'Pump Room', 'Store-01', 'Store-02', 'Elect. DB (4)'
  ],
}

// Helper to get all blocks for a specific floor
export function getBlocksByFloor(floor: 'ground' | 'first'): BlockDefinition[] {
  return floor === 'ground' ? CAMP1_GROUND_BLOCKS : CAMP1_FIRST_BLOCKS
}

// Helper to get a block by code
export function getBlockByCode(code: string): BlockDefinition | undefined {
  return [...CAMP1_GROUND_BLOCKS, ...CAMP1_FIRST_BLOCKS].find(b => b.code === code)
}
