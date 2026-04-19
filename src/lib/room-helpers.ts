// ROOM DATA EXTRACTION HELPERS
// Centralized helpers to extract room data from API responses
// Updated to use current_month from monthly_records (BARTAWI_BACKEND_FOUNDATION.md Step 5)

/**
 * Helper to safely convert any value to number
 */
function toNumber(val: any): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  const parsed = parseFloat(String(val))
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Get monthly rent from current_month record
 */
export function getMonthlyRent(room: any): number {
  return toNumber(room?.current_month?.rent)
}

/**
 * Get paid amount from current_month record
 */
export function getPaid(room: any): number {
  return toNumber(room?.current_month?.paid)
}

/**
 * Get outstanding balance from current_month record
 */
export function getBalance(room: any): number {
  return toNumber(room?.current_month?.balance)
}

/**
 * Get remarks from current_month record
 */
export function getRemarks(room: any): string | null {
  return room?.current_month?.remarks || null
}

/**
 * Get current month label (e.g., "March 2026")
 */
export function getCurrentMonthLabel(room: any): string {
  const cm = room?.current_month
  if (!cm) return ''
  return `${cm.month_name} ${cm.year}`
}

/**
 * Get contract type from current_month record
 */
export function getContractType(room: any): string | null {
  return room?.current_month?.contract_type || null
}

/**
 * Get monthly history (up to 3 months)
 */
export function getMonthlyHistory(room: any) {
  const records = room?.monthly_records || []
  return records.map((r: any) => ({
    month: r.month,
    month_name: r.month_name,
    year: r.year,
    rent: toNumber(r.rent),
    paid: toNumber(r.paid),
    balance: toNumber(r.balance),
  }))
}

/**
 * Get tenant name from room object
 * Tries current_month first, then falls back to current_occupancy
 */
export function getTenantName(room: any): string {
  // Try current_month first (from monthly_records)
  if (room?.current_month?.owner_name) {
    return room.current_month.owner_name
  }
  if (room?.current_month?.company_name) {
    return room.current_month.company_name
  }

  // Fallback to current_occupancy
  if (room?.current_occupancy?.individual?.owner_name) {
    return room.current_occupancy.individual.owner_name
  }
  if (room?.current_occupancy?.individual?.full_name) {
    return room.current_occupancy.individual.full_name
  }
  if (room?.current_occupancy?.company?.name) {
    return room.current_occupancy.company.name
  }

  return ''
}

/**
 * Get company name from room object
 */
export function getCompanyName(room: any): string {
  // Try current_month first
  if (room?.current_month?.company_name) {
    return room.current_month.company_name
  }

  // Fallback to current_occupancy
  if (room?.current_occupancy?.company?.name) {
    return room.current_occupancy.company.name
  }

  return ''
}

/**
 * Get people count from room object
 */
export function getPeopleCount(room: any): number {
  // Try current_month first
  if (room?.current_month?.people_count !== undefined) {
    return Number(room.current_month.people_count) || 0
  }

  // Fallback to current_occupancy
  if (room?.current_occupancy?.people_count !== undefined) {
    return Number(room.current_occupancy.people_count) || 0
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
  if (room?.current_occupancy?.individual?.mobile) {
    return room.current_occupancy.individual.mobile
  }
  if (room?.current_occupancy?.individual?.mobile_number) {
    return room.current_occupancy.individual.mobile_number
  }
  return ''
}

/**
 * Get tenant nationality from room object
 */
export function getNationality(room: any): string {
  if (room?.current_occupancy?.individual?.nationality) {
    return room.current_occupancy.individual.nationality
  }
  return ''
}

/**
 * Get check-in date from room object
 */
export function getCheckInDate(room: any): string {
  if (room?.current_occupancy?.check_in_date) {
    return room.current_occupancy.check_in_date
  }
  return ''
}

/**
 * Normalize room code to canonical format for matching
 * Converts both "A01" and "A-01" to "A-1" (no leading zeros, with hyphen)
 * Examples: "A01" → "A-1", "A-1" → "A-1", "BB06" → "BB-6"
 */
export function normalizeRoomCode(code: string): string {
  if (!code) return ''
  // Match pattern: optional letters, optional hyphen, optional leading zeros, digits
  const match = code.match(/^([A-Z]+)-?0*(\d+)$/i)
  if (match) return `${match[1]}-${match[2]}`
  return code
}

/**
 * PAYMENT STATUS — Single source of truth for payment state visualization
 * Phase 4A Issue 2 fix
 */
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'vacant' | 'bartawi'

/**
 * Determine payment status for a room based on rent/paid/balance
 */
export function getPaymentStatus(room: any): PaymentStatus {
  // Bartawi/service rooms
  const propertyType = (typeof room?.property_type === 'object'
    ? room.property_type?.name : room?.property_type) || ''
  if (String(propertyType).toLowerCase().includes('bartawi')) return 'bartawi'

  // Vacant — no active lease and no current_month tenant
  const hasLease = !!(room?.active_lease?.id || room?.current_month?.lease_id)
  const hasTenant = !!(room?.current_month?.tenant)
  if (!hasLease && !hasTenant) return 'vacant'

  const rent = toNumber(room?.current_month?.rent)
  const paid = toNumber(room?.current_month?.paid)

  if (rent === 0) return 'vacant'
  if (paid === 0) return 'unpaid'
  if (paid >= rent) return 'paid'
  return 'partial'
}

/**
 * Color mapping for payment status
 */
export const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid:    '#1E4D52',  // teal
  partial: '#B8883D',  // amber
  unpaid:  '#A84A3B',  // rust
  vacant:  '#D6CFC5',  // dust
  bartawi: '#8B6420',  // amber-gold
}

/**
 * Label mapping for payment status
 */
export const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid:    'Paid',
  partial: 'Partial',
  unpaid:  'Unpaid',
  vacant:  'Vacant',
  bartawi: 'Bartawi',
}
