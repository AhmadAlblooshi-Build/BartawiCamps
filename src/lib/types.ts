export interface User {
  id: string
  email: string
  fullName: string
  permissions: string[]
}

export interface Camp {
  id: string
  code: 'C1' | 'C2'
  name: string
  total_rooms: number
  leasable_rooms: number
  map_configured: boolean
}

export interface Room {
  id: string
  camp_id: string
  block_id: string
  property_type_id: string | null
  room_number: string
  old_room_number: string | null
  sr_number: number
  max_capacity: number
  standard_rent: string  // Decimal string
  room_size: 'big' | 'small' | 'service'
  status: 'occupied' | 'vacant' | 'vacating' | 'bartawi_use' | 'maintenance' | 'reserved'
  room_type: string
  is_active: boolean
  fp_x: number | null
  fp_y: number | null
  fp_width: number | null
  fp_height: number | null
  current_occupancy?: RoomOccupancy | null
  property_type?: PropertyType | null
}

export interface PropertyType {
  id: string
  name: string
  slug: string
  description?: string
  icon_name?: string
  display_color: 'amber' | 'teal' | 'rust' | 'neutral'
  is_residential: boolean
  is_leasable: boolean
}

export interface RoomOccupancy {
  id: string
  room_id: string
  individual_id: string | null
  company_id: string | null
  contract_id: string | null
  is_current: boolean
  check_in_date: string
  check_out_date: string | null
  notice_given_at: string | null
  intended_vacate_date: string | null
  status: 'active' | 'notice_given' | 'checked_out' | 'transferred' | 'evicted'
  individual?: Individual | null
  company?: Company | null
  contract?: Contract | null
}

export interface Individual {
  id: string
  owner_name: string | null
  full_name: string | null
  mobile_number: string | null
  nationality: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

export interface Company {
  id: string
  name: string
  name_normalized: string
  contact_person: string | null
  entity_group_name: string | null
  related_entity_id: string | null
}

export interface Contract {
  id: string
  camp_id: string
  room_id: string
  company_id: string | null
  contract_type: 'monthly' | 'yearly' | 'ejari' | 'bgc'
  monthly_rent: string
  start_date: string
  end_date: string | null
  ejari_number: string | null
  status: 'active' | 'terminated' | 'legal_dispute' | 'expired' | 'pending_renewal'
  urgency?: 'expired' | 'critical' | 'warning' | 'notice' | 'healthy'
  days_until_expiry?: number | null
  rooms?: { room_number: string }
  companies?: { name: string; id: string }
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  resource_type: string | null
  resource_id: string | null
  snoozed_until: string | null
  created_at: string
}

export interface Deposit {
  id: string
  room_id: string
  amount: string
  currency: string
  payment_method: string
  status: 'pending' | 'held' | 'partially_refunded' | 'refunded' | 'forfeited'
  receipt_number: string
  collected_at: string
  refunded_amount?: string
  forfeited_amount?: string
}

export interface MaintenanceRequest {
  id: string
  request_number: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'assigned' | 'in_progress' | 'blocked' | 'resolved' | 'closed' | 'cancelled'
  room_id: string | null
  assigned_team_id: string | null
  assigned_user_id: string | null
  created_at: string
  resolved_at: string | null
  room?: { room_number: string }
  assigned_team?: { name: string }
  assigned_user?: { full_name: string }
  category?: { name: string }
}

export interface Pagination {
  limit: number
  has_more: boolean
  next_cursor: string | null
}
