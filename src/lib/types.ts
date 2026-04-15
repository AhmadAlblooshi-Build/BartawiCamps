// All TypeScript types matching the database schema exactly

export type CampCode = 'C1' | 'C2'

export interface Camp {
  id: string
  name: string
  code: CampCode
  city: string
  total_rooms: number
  leasable_rooms: number
  map_configured: boolean
}

export interface Building {
  id: string
  camp_id: string
  code: string
  name: string
  floor_count: number
  ground_block_code: string
  upper_block_code: string
  map_x: number | null  // NULL until layout paper processed
  map_y: number | null
  blocks?: Block[]
}

export interface Block {
  id: string
  building_id: string
  code: string
  floor_label: string
  floor_number: number
  room_count: number
}

export type RoomType = 'standard' | 'bartawi' | 'commercial' | 'service'
export type RoomStatus = 'occupied' | 'vacant' | 'maintenance' | 'bartawi_use'

export interface Room {
  id: string
  camp_id: string
  block_id: string
  building_id: string
  room_number: string
  sr_number: number
  room_type: RoomType
  max_capacity: number
  standard_rent: number
  status: RoomStatus
  map_x: number | null
  map_y: number | null
  block?: Block
  building?: Building
  current_occupancy?: Occupancy
  monthly_records?: MonthlyRecord[]
}

export interface Company {
  id: string
  name: string
  contact_person?: string
  contact_phone?: string
  industry?: string
}

export interface Individual {
  id: string
  owner_name: string
  full_name?: string
  nationality?: string
  mobile_number?: string
}

export type ContractType = 'monthly' | 'yearly' | 'ejari' | 'bgc'
export type ContractStatus = 'active' | 'expired' | 'terminated' | 'legal_dispute' | 'pending_renewal'

export interface Contract {
  id: string
  contract_type: ContractType
  monthly_rent: number
  start_date: string | null
  end_date: string | null
  status: ContractStatus
}

export interface Occupancy {
  id: string
  room_id: string
  people_count: number
  monthly_rent: number
  check_in_date: string | null
  status: string
  individual?: Individual
  company?: Company
  contract?: Contract
}

export interface MonthlyRecord {
  id: string
  room_id: string
  camp_id: string
  month: number
  year: number
  owner_name?: string
  company_name?: string
  contract_type?: string
  people_count: number
  rent: number
  paid: number
  balance: number   // generated column — NEVER write this
  remarks?: string
  room?: Room
  individual?: Individual
  company?: Company
}

export interface Payment {
  id: string
  monthly_record_id: string
  room_id: string
  amount: number
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'card'
  payment_date: string
  reference_number?: string
  bank_name?: string
  cheque_number?: string
  notes?: string
}

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Complaint {
  id: string
  complaint_ref: string
  camp_id: string
  room_id?: string
  title: string
  description?: string
  status: ComplaintStatus
  priority: ComplaintPriority
  reported_by_name?: string
  reported_by_room?: string
  reported_via: 'staff' | 'qr_code' | 'mobile_app'
  created_at: string
  updated_at: string
  room?: Room
}

export interface DashboardData {
  camp: Camp
  period: { month: number; year: number }
  occupancy: {
    total_rooms: number
    occupied: number
    vacant: number
    bartawi_use: number
    occupancy_rate: number
    leasable_rooms: number
  }
  financials: {
    total_rent: number
    total_paid: number
    total_balance: number
    collection_rate: number
  }
  outstanding_records: MonthlyRecord[]
}

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiError {
  error: string
  message: string
}

// Form types
export interface PaymentFormData {
  monthly_record_id: string
  room_id: string
  camp_id: string
  amount: number
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'card'
  payment_date: string
  reference_number?: string
  bank_name?: string
  cheque_number?: string
  notes?: string
}

export interface ComplaintFormData {
  camp_id: string
  room_id?: string
  title: string
  description?: string
  priority: ComplaintPriority
  reported_by_name?: string
  reported_by_room?: string
  category_id?: string
}

// Filter types
export interface RoomFilters {
  blockCode?: string
  status?: RoomStatus
  has_balance?: boolean
  room_type?: RoomType
  search?: string
}

export interface RecordFilters {
  campId?: string
  month?: number
  year?: number
  has_balance?: boolean
  page?: number
  limit?: number
}

// ── FEATURES 4-7 TYPES ────────────────────────────────────────────────────

export interface CheckoutFormData {
  room_id: string
  camp_id: string
  occupancy_id?: string
  checkout_date: string
  reason_for_leaving: string
  final_balance_settled: boolean
  notes?: string
}

export interface CheckinFormData {
  room_id: string
  camp_id: string
  owner_name?: string
  individual_id?: string
  company_id?: string
  company_name?: string
  contract_type?: string
  contract_start_date?: string
  contract_end_date?: string
  ejari_number?: string
  monthly_rent: number
  people_count: number
  checkin_date: string
  off_days?: number
}

export type ContractUrgency = 'expired' | 'critical' | 'warning' | 'notice' | 'healthy'

export interface ContractWithDetails {
  id: string
  camp_id: string
  room_id: string
  company_id?: string
  contract_type: string
  monthly_rent: number
  start_date: string | null
  end_date: string | null
  status: string
  ejari_number?: string
  days_until_expiry: number | null
  urgency: ContractUrgency
  rooms?: { room_number: string }
  companies?: {
    id: string
    name: string
    contact_person?: string
    contact_phone?: string
  }
  contract_alerts?: any[]
  notes?: string
}

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  resource_type: string
  resource_id: string
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface ReportSummary {
  report_type: string
  camp: { id: string; name: string; code: string }
  period: { month: number; year: number }
  occupancy: {
    total_rooms: number
    leasable_rooms: number
    occupied: number
    vacant: number
    bartawi_use: number
    occupancy_rate: number
  }
  financials: {
    total_rent: number
    total_paid: number
    total_balance: number
    collection_rate: number
  }
  outstanding_records?: any[]
  generated_at: string
}
