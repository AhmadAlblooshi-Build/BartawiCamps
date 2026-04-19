// ROOM DATA EXTRACTION HELPERS
// Centralized helpers to extract room data from API responses
// This prevents property path mismatches across components
//
// Created as part of BARTAWI_DATA_RECONCILIATION.md implementation
// All components should use these helpers instead of direct property access

/**
 * Get tenant name from room object
 * Tries all possible property paths based on actual API shape
 */
export function getTenantName(room: any): string {
  // Try latestMonthlyRecord first (from room detail endpoint)
  if (room?.latestMonthlyRecord?.owner_name) {
    return room.latestMonthlyRecord.owner_name
  }
  if (room?.latestMonthlyRecord?.company_name) {
    return room.latestMonthlyRecord.company_name
  }

  // Try current_occupancy paths (usually null in list endpoint)
  if (room?.current_occupancy?.individual?.owner_name) {
    return room.current_occupancy.individual.owner_name
  }
  if (room?.current_occupancy?.individual?.full_name) {
    return room.current_occupancy.individual.full_name
  }
  if (room?.current_occupancy?.company?.name) {
    return room.current_occupancy.company.name
  }
  if (room?.current_occupancy?.company_name) {
    return room.current_occupancy.company_name
  }
  if (room?.current_occupancy?.tenant_name) {
    return room.current_occupancy.tenant_name
  }

  // Try currentOccupancy (camelCase from detail endpoint)
  if (room?.currentOccupancy?.individual?.owner_name) {
    return room.currentOccupancy.individual.owner_name
  }
  if (room?.currentOccupancy?.company?.name) {
    return room.currentOccupancy.company.name
  }

  // Try flat tenant_name
  if (room?.tenant_name) {
    return room.tenant_name
  }

  return ''
}

/**
 * Get company name from room object
 */
export function getCompanyName(room: any): string {
  // Try latestMonthlyRecord first
  if (room?.latestMonthlyRecord?.company_name) {
    return room.latestMonthlyRecord.company_name
  }

  // Try current_occupancy paths
  if (room?.current_occupancy?.company?.name) {
    return room.current_occupancy.company.name
  }
  if (room?.current_occupancy?.company_name) {
    return room.current_occupancy.company_name
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.company?.name) {
    return room.currentOccupancy.company.name
  }

  return ''
}

/**
 * Get people count (beds occupied) from room object
 */
export function getPeopleCount(room: any): number {
  // Try latestMonthlyRecord first
  if (room?.latestMonthlyRecord?.peopleCount !== undefined) {
    return Number(room.latestMonthlyRecord.peopleCount) || 0
  }

  // Try current_occupancy paths
  if (room?.current_occupancy?.people_count !== undefined) {
    return Number(room.current_occupancy.people_count) || 0
  }
  if (room?.current_occupancy?.beds_occupied !== undefined) {
    return Number(room.current_occupancy.beds_occupied) || 0
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.peopleCount !== undefined) {
    return Number(room.currentOccupancy.peopleCount) || 0
  }

  return 0
}

/**
 * Get monthly rent from room object
 */
export function getMonthlyRent(room: any): number {
  // Try monthly_records first (current period's rent)
  if (room?.monthly_records?.length > 0) {
    const latest = room.monthly_records[0]
    const rent = typeof latest?.rent === 'string'
      ? parseFloat(latest.rent)
      : latest?.rent
    if (rent) return rent
  }

  // Try latestMonthlyRecord fallback
  if (room?.latestMonthlyRecord?.rent !== undefined) {
    const rent = typeof room.latestMonthlyRecord.rent === 'string'
      ? parseFloat(room.latestMonthlyRecord.rent)
      : room.latestMonthlyRecord.rent
    return rent || 0
  }

  // Try current_occupancy paths
  if (room?.current_occupancy?.monthly_rent !== undefined) {
    const rent = typeof room.current_occupancy.monthly_rent === 'string'
      ? parseFloat(room.current_occupancy.monthly_rent)
      : room.current_occupancy.monthly_rent
    return rent || 0
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.monthly_rent !== undefined) {
    const rent = typeof room.currentOccupancy.monthly_rent === 'string'
      ? parseFloat(room.currentOccupancy.monthly_rent)
      : room.currentOccupancy.monthly_rent
    return rent || 0
  }
  if (room?.currentOccupancy?.monthlyRent !== undefined) {
    const rent = typeof room.currentOccupancy.monthlyRent === 'string'
      ? parseFloat(room.currentOccupancy.monthlyRent)
      : room.currentOccupancy.monthlyRent
    return rent || 0
  }

  // Fallback to standard rent
  if (room?.standard_rent !== undefined) {
    const rent = typeof room.standard_rent === 'string'
      ? parseFloat(room.standard_rent)
      : room.standard_rent
    return rent || 0
  }

  return 0
}

/**
 * Get room status normalized to one of: occupied, vacant, vacating, maintenance, bartawi_use
 */
export function getRoomStatus(room: any): string {
  const status = room?.status?.toLowerCase() || 'vacant'

  // Normalize variations
  if (status === 'rented' || status === 'occupied') return 'occupied'
  if (status === 'bartawi room' || status === 'bartawi_use' || status === 'bartawi') return 'bartawi_use'
  if (status === 'vacant' || status === 'available') return 'vacant'
  if (status === 'vacating' || status === 'notice_given') return 'vacating'
  if (status === 'maintenance' || status === 'under_maintenance') return 'maintenance'

  return status
}

/**
 * Check if room is occupied (including bartawi use)
 */
export function isOccupied(room: any): boolean {
  const status = getRoomStatus(room)
  return status === 'occupied' || status === 'bartawi_use'
}

/**
 * Get current balance for room
 */
export function getBalance(room: any): number {
  // Balance lives in monthly_records[0].balance (the latest month's record)
  // This matches the pattern used for getPaid
  if (room?.monthly_records?.length > 0) {
    const latest = room.monthly_records[0]
    // Backend may send balance as a number or a string — coerce to number
    const balance = typeof latest?.balance === 'string'
      ? parseFloat(latest.balance)
      : latest?.balance
    return balance || 0
  }

  // Try latestMonthlyRecord fallback
  if (room?.latestMonthlyRecord?.balance !== undefined) {
    const balance = typeof room.latestMonthlyRecord.balance === 'string'
      ? parseFloat(room.latestMonthlyRecord.balance)
      : room.latestMonthlyRecord.balance
    return balance || 0
  }

  // Try current_occupancy
  if (room?.current_occupancy?.balance !== undefined) {
    const balance = typeof room.current_occupancy.balance === 'string'
      ? parseFloat(room.current_occupancy.balance)
      : room.current_occupancy.balance
    return balance || 0
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.balance !== undefined) {
    const balance = typeof room.currentOccupancy.balance === 'string'
      ? parseFloat(room.currentOccupancy.balance)
      : room.currentOccupancy.balance
    return balance || 0
  }

  // Try flat balance
  if (room?.balance !== undefined) {
    const balance = typeof room.balance === 'string'
      ? parseFloat(room.balance)
      : room.balance
    return balance || 0
  }

  return 0
}

/**
 * Get paid amount for room's current month
 */
export function getPaid(room: any): number {
  // Try monthly_records array first (backend returns this)
  if (room?.monthly_records?.length > 0) {
    const latest = room.monthly_records[0] // First element is most recent due to DESC order
    const paid = typeof latest?.paid === 'string'
      ? parseFloat(latest.paid)
      : latest?.paid
    return paid || 0
  }

  // Try latestMonthlyRecord fallback
  if (room?.latestMonthlyRecord?.paid !== undefined) {
    const paid = typeof room.latestMonthlyRecord.paid === 'string'
      ? parseFloat(room.latestMonthlyRecord.paid)
      : room.latestMonthlyRecord.paid
    return paid || 0
  }

  // Calculate from rent - balance if available
  const rent = getMonthlyRent(room)
  const balance = getBalance(room)
  if (rent > 0) {
    return Math.max(0, rent - balance)
  }

  return 0
}

/**
 * Get payment percentage for room (0-100)
 */
export function getPaymentPercentage(room: any): number {
  const rent = getMonthlyRent(room)
  const balance = getBalance(room)

  if (rent === 0) return 0

  const paid = rent - balance
  const percentage = (paid / rent) * 100

  return Math.max(0, Math.min(100, percentage))
}

/**
 * Format room number to match display format (e.g., "A01" -> "A-1")
 * Used when API returns "A01" but we want to display "A-1"
 */
export function formatRoomNumber(roomNumber: string): string {
  if (!roomNumber) return ''

  // If already has hyphen, return as-is
  if (roomNumber.includes('-')) return roomNumber

  // Match pattern like "A01" or "AA01"
  const match = roomNumber.match(/^([A-Z]+)(\d+)$/i)
  if (match) {
    const block = match[1]
    const number = parseInt(match[2], 10)
    return `${block}-${number}`
  }

  return roomNumber
}

/**
 * Get block code from room
 */
export function getBlockCode(room: any): string {
  return room?.block?.code || ''
}

/**
 * Get floor label from room
 */
export function getFloorLabel(room: any): string {
  return room?.block?.floor_label || room?.block?.floor || ''
}

/**
 * Get tenant mobile number from room object
 */
export function getMobile(room: any): string {
  // Try current_occupancy paths
  if (room?.current_occupancy?.individual?.mobile) {
    return room.current_occupancy.individual.mobile
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.individual?.mobile) {
    return room.currentOccupancy.individual.mobile
  }

  return ''
}

/**
 * Get tenant nationality from room object
 */
export function getNationality(room: any): string {
  // Try current_occupancy paths
  if (room?.current_occupancy?.individual?.nationality) {
    return room.current_occupancy.individual.nationality
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.individual?.nationality) {
    return room.currentOccupancy.individual.nationality
  }

  return ''
}

/**
 * Get check-in date from room object
 */
export function getCheckInDate(room: any): string {
  // Try current_occupancy paths
  if (room?.current_occupancy?.check_in_date) {
    return room.current_occupancy.check_in_date
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.check_in_date) {
    return room.currentOccupancy.check_in_date
  }
  if (room?.currentOccupancy?.checkInDate) {
    return room.currentOccupancy.checkInDate
  }

  return ''
}

/**
 * Get contract type from room object
 */
export function getContractType(room: any): string {
  // Try current_occupancy paths
  if (room?.current_occupancy?.contract_type) {
    return room.current_occupancy.contract_type
  }

  // Try currentOccupancy (camelCase)
  if (room?.currentOccupancy?.contract_type) {
    return room.currentOccupancy.contract_type
  }
  if (room?.currentOccupancy?.contractType) {
    return room.currentOccupancy.contractType
  }

  return ''
}
