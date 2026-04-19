import {
  GROUND_FLOOR_BLOCKS as CAMP1_GROUND,
  FIRST_FLOOR_BLOCKS as CAMP1_FIRST,
  CAMP1_FACILITIES,
  getBlockByCode as getCamp1Block,
  type BlockLayout,
  type FloorLevel,
  type Facility,
} from './camp1-layout'

import {
  CAMP2_GROUND_FLOOR_BLOCKS,
  CAMP2_FIRST_FLOOR_BLOCKS,
  CAMP2_FACILITIES,
  getCamp2BlockByCode,
} from './camp2-layout'

export type { BlockLayout, FloorLevel, Facility, RoomPosition, RoomType } from './camp1-layout'

export function resolveCamp(campIdentifier: string): 'camp1' | 'camp2' {
  const normalized = (campIdentifier || '').toLowerCase()
  if (normalized.includes('camp-02') || normalized.includes('camp 2') || normalized.includes('camp2')) {
    return 'camp2'
  }
  return 'camp1'
}

// Also detect camp from rooms data — safer when we don't have camp metadata
export function resolveCampFromRooms(rooms: any[]): 'camp1' | 'camp2' {
  // Camp 2 has unique block codes: U, UU, S, SS
  const hasCamp2Blocks = rooms.some((r: any) =>
    ['U', 'UU', 'S', 'SS'].includes(r.block?.code)
  )
  return hasCamp2Blocks ? 'camp2' : 'camp1'
}

export function getBlocksByFloor(campIdentifier: string, floor: FloorLevel): BlockLayout[] {
  const camp = resolveCamp(campIdentifier)
  if (camp === 'camp2') {
    return floor === 'ground' ? CAMP2_GROUND_FLOOR_BLOCKS : CAMP2_FIRST_FLOOR_BLOCKS
  }
  return floor === 'ground' ? CAMP1_GROUND : CAMP1_FIRST
}

export function getBlockByCode(campIdentifier: string, code: string): BlockLayout | undefined {
  const camp = resolveCamp(campIdentifier)
  if (camp === 'camp2') {
    return getCamp2BlockByCode(code)
  }
  return getCamp1Block(code)
}

export function getFacilities(campIdentifier: string): Facility[] {
  const camp = resolveCamp(campIdentifier)
  return camp === 'camp2' ? CAMP2_FACILITIES : CAMP1_FACILITIES
}
