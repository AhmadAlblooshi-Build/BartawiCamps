import { useQuery } from '@tanstack/react-query'
import { endpoints } from './api'
import { getBalance, getRoomStatus, getTenantName, getCompanyName } from './room-helpers'
import { getContractInfo } from './contract-helpers'

function safeString(val: any): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  return ''  // objects, arrays, anything else → empty
}

function extractPropertyType(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.name || val.slug || ''
  return String(val)
}

export interface OperationsRoom {
  // Raw room data
  raw: any

  // Derived/normalized fields for fast filtering
  roomNumber: string
  campName: string       // 'Camp 1' or 'Camp 2'
  campId: string
  blockCode: string
  floor: string
  tenant: string         // display name (company OR individual)
  isCompany: boolean
  contractType: string | null    // 'yearly' | 'monthly' | null
  rent: number
  paid: number
  balance: number
  isSynthesized: boolean
  status: string         // 'occupied' | 'vacant' | ...
  isBartawi: boolean
  contractEndDate: string | null
  contractStartDate: string | null
  daysUntilExpiry: number | null
  contractStatus: string // 'active' | 'expired' | 'expiring_soon' | 'none'
  hasLegalIssue: boolean
  remarks: string | null
  propertyType: string
}

function deriveRoom(raw: any, campName: string, campId: string): OperationsRoom {
  const contract = getContractInfo(raw)
  const tenant = getTenantName(raw) || getCompanyName(raw) || ''
  const status = getRoomStatus(raw)

  const propertyTypeRaw = extractPropertyType(raw?.property_type)
  const propertyType = propertyTypeRaw.toLowerCase()   // for Bartawi detection
  const contractTypeStr = safeString(raw?.current_month?.contract_type).toLowerCase()
  const tenantLower = safeString(tenant).toLowerCase()
  const isBartawi =
    propertyType.includes('bartawi') ||
    contractTypeStr.includes('bartawi') ||
    ['camp boss', 'bgc', 'camp office', 'security room', 'cleaners', 'mosque', 'electricity'].some(
      kw => tenantLower.includes(kw)
    )

  return {
    raw,
    roomNumber: raw.room_number,
    campName,
    campId,
    blockCode: raw.block?.code || '',
    floor: raw.block?.floor_label || '',
    tenant: safeString(tenant),
    isCompany: !!safeString(raw?.current_month?.company_name),
    contractType: contract.type,
    rent: raw?.current_month?.rent || 0,
    paid: raw?.current_month?.paid || 0,
    balance: getBalance(raw),
    isSynthesized: raw?.current_month?.is_synthesized || false,
    status,
    isBartawi,
    contractEndDate: contract.endDate,
    contractStartDate: contract.startDate,
    daysUntilExpiry: contract.daysUntilExpiry,
    contractStatus: contract.status,
    hasLegalIssue: contract.hasLegalIssue,
    remarks: raw?.current_month?.remarks || null,
    propertyType: propertyTypeRaw,
  }
}

export function useOperationsData() {
  // Fetch list of camps
  const campsQuery = useQuery({
    queryKey: ['camps'],
    queryFn: () => endpoints.camps(),
  })

  const camps = campsQuery.data?.data || []

  // Fetch rooms for each camp in parallel
  const camp1 = camps.find((c: any) =>
    c.code === 'C1' || c.name?.toLowerCase().includes('camp 1')
  )
  const camp2 = camps.find((c: any) =>
    c.code === 'C2' || c.name?.toLowerCase().includes('camp 2')
  )

  const camp1Query = useQuery({
    queryKey: ['rooms', camp1?.id],
    queryFn: () => endpoints.rooms({ camp_id: camp1.id, limit: 500 }),
    enabled: !!camp1?.id,
  })

  const camp2Query = useQuery({
    queryKey: ['rooms', camp2?.id],
    queryFn: () => endpoints.rooms({ camp_id: camp2.id, limit: 500 }),
    enabled: !!camp2?.id,
  })

  const isLoading = campsQuery.isLoading || camp1Query.isLoading || camp2Query.isLoading
  const error = campsQuery.error || camp1Query.error || camp2Query.error

  // Merge rooms with camp metadata
  const allRooms: OperationsRoom[] = []
  if (camp1Query.data?.data && camp1?.id) {
    for (const r of camp1Query.data.data) {
      allRooms.push(deriveRoom(r, camp1.name || 'Camp 1', camp1.id))
    }
  }
  if (camp2Query.data?.data && camp2?.id) {
    for (const r of camp2Query.data.data) {
      allRooms.push(deriveRoom(r, camp2.name || 'Camp 2', camp2.id))
    }
  }

  return {
    allRooms,
    camps: { camp1, camp2 },
    isLoading,
    error,
  }
}

export function getOutstandingRooms(rooms: OperationsRoom[]): OperationsRoom[] {
  return rooms
    .filter(r => r.balance > 0 && !r.isBartawi)
    .sort((a, b) => {
      // Confirmed first (not synthesized), then by balance desc
      if (a.isSynthesized !== b.isSynthesized) {
        return a.isSynthesized ? 1 : -1
      }
      return b.balance - a.balance
    })
}

export function getExpiredRooms(rooms: OperationsRoom[]): OperationsRoom[] {
  return rooms
    .filter(r => r.contractStatus === 'expired' && !r.isBartawi)
    .sort((a, b) => {
      const aDays = a.daysUntilExpiry ?? 0
      const bDays = b.daysUntilExpiry ?? 0
      return aDays - bDays  // most expired first (negative)
    })
}

export function getExpiringSoonRooms(rooms: OperationsRoom[]): OperationsRoom[] {
  return rooms
    .filter(r => r.contractStatus === 'expiring_soon' && !r.isBartawi)
    .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0))
}

export function getVacantRooms(rooms: OperationsRoom[]): OperationsRoom[] {
  return rooms
    .filter(r => !r.isBartawi && (r.status === 'vacant' || (!r.tenant && r.status !== 'occupied')))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

export interface OperationsSummary {
  outstandingTotal: number
  outstandingCount: number
  confirmedOutstandingCount: number
  pendingEntryCount: number
  expiredCount: number
  expiringCount: number
  vacantCount: number
  totalBilling: number
  camp1Billing: number
  camp2Billing: number
}

export function getSummary(rooms: OperationsRoom[]): OperationsSummary {
  const outstanding = rooms.filter(r => r.balance > 0 && !r.isBartawi)
  const confirmed = outstanding.filter(r => !r.isSynthesized)
  const pending = outstanding.filter(r => r.isSynthesized)

  const totalBilling = rooms.filter(r => !r.isBartawi).reduce((s, r) => s + r.rent, 0)
  const camp1Billing = rooms
    .filter(r => !r.isBartawi && r.campName.toLowerCase().includes('camp 1'))
    .reduce((s, r) => s + r.rent, 0)
  const camp2Billing = rooms
    .filter(r => !r.isBartawi && r.campName.toLowerCase().includes('camp 2'))
    .reduce((s, r) => s + r.rent, 0)

  return {
    outstandingTotal: outstanding.reduce((s, r) => s + r.balance, 0),
    outstandingCount: outstanding.length,
    confirmedOutstandingCount: confirmed.length,
    pendingEntryCount: pending.length,
    expiredCount: rooms.filter(r => r.contractStatus === 'expired' && !r.isBartawi).length,
    expiringCount: rooms.filter(r => r.contractStatus === 'expiring_soon' && !r.isBartawi).length,
    vacantCount: rooms.filter(r => !r.isBartawi && (r.status === 'vacant' || (!r.tenant && r.status !== 'occupied'))).length,
    totalBilling,
    camp1Billing,
    camp2Billing,
  }
}
