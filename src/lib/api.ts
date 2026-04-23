import { useSession } from './auth'
import { toQS } from './utils'

const BASE = process.env.NEXT_PUBLIC_API_BASE
  ? `${process.env.NEXT_PUBLIC_API_BASE}/api`
  : '/api'

export interface ApiError extends Error {
  code?: string
  status?: number
  details?: any
}

// Phase 4B.6: Occupant Management types
export interface Occupant {
  id: string
  saas_tenant_id: string
  lease_id: string
  bedspace_id: string
  linked_tenant_id: string | null
  full_name: string
  national_id: string | null
  passport_number: string | null
  phone: string | null
  nationality: string | null
  date_of_birth: string | null
  photo_url: string | null
  status: 'active' | 'archived'
  checked_in_at: string
  checked_out_at: string | null
  checkout_reason: 'swap' | 'lease_ended' | 'left_voluntarily' | 'terminated' | 'other' | null
  checkout_notes: string | null
  notes: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  bedspace?: any
  linked_tenant?: any
  lease?: any
}

export interface OccupantCreatePayload {
  bedspace_id: string
  full_name: string
  national_id?: string | null
  passport_number?: string | null
  phone?: string | null
  nationality?: string | null
  date_of_birth?: string | null
  emergency_contact?: string | null
  emergency_phone?: string | null
  notes?: string | null
  checked_in_at?: string | null
  linked_tenant_id?: string | null
}

export interface OccupantSwapPayload {
  from_occupant_id: string
  to_occupant: Omit<OccupantCreatePayload, 'bedspace_id'>
  reason?: string | null
}

function makeError(status: number, body: any, fallback = 'Request failed'): ApiError {
  const err = new Error(body?.error?.message || body?.message || fallback) as ApiError
  err.code = body?.error?.code
  err.status = status
  err.details = body?.error?.details
  return err
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useSession.getState().token
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE}/v1${path}`, { ...init, headers })

  if (res.status === 401) {
    useSession.getState().clear()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?next=${next}&expired=1`
    }
    throw makeError(401, null, 'Session expired')
  }

  let body: any = null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    body = await res.json().catch(() => null)
  }

  if (!res.ok) throw makeError(res.status, body, `HTTP ${res.status}`)
  return (body as T) ?? (undefined as any)
}

export const api = {
  get:    <T = any>(p: string, init?: RequestInit) => request<T>(p, { ...init, method: 'GET' }),
  post:   <T = any>(p: string, data?: any, init?: RequestInit) => request<T>(p, { ...init, method: 'POST',  body: data ? JSON.stringify(data) : undefined }),
  put:    <T = any>(p: string, data?: any, init?: RequestInit) => request<T>(p, { ...init, method: 'PUT',   body: data ? JSON.stringify(data) : undefined }),
  patch:  <T = any>(p: string, data?: any, init?: RequestInit) => request<T>(p, { ...init, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T = any>(p: string, init?: RequestInit) => request<T>(p, { ...init, method: 'DELETE' }),
}

export const endpoints = {
  // --- auth ---
  login:  (email: string, password: string) => api.post<{ token: string; user: { id: string; email: string; fullName: string; permissions: string[] } }>('/auth/login', { email, password }),
  me:     () => api.get<{ id: string; email: string; fullName: string; permissions: string[] }>('/auth/me'),

  // --- camps ---
  camps:  () => api.get<{ data: any[] }>('/camps'),
  camp:   (id: string) => api.get<any>(`/camps/${id}`),
  campLatestMonth: (id: string) => api.get<{ month: number; year: number }>(`/camps/${id}/latest-month`),

  // --- rooms ---
  rooms: (params?: Record<string, any>) => api.get<{ data: any[]; pagination: any }>(`/rooms${toQS(params)}`),
  room:  (id: string) => api.get<any>(`/rooms/${id}`),
  roomHistory: (id: string) => api.get<{ data: any[] }>(`/rooms/${id}/history`),
  roomBalance: (id: string) => api.get<{ outstanding: number; by_month: any[] }>(`/rooms/${id}/balance`),

  // --- occupancy ---
  checkin: (data: any) => api.post('/occupancy/checkin', data),
  notice:  (data: any) => api.post('/occupancy/notice', data),
  completeCheckout: (data: any) => api.post('/occupancy/complete-checkout', data),
  searchEntities: (query: string, type: 'individual' | 'company' | 'both' = 'both') =>
    api.get<{ data: any[] }>(`/occupancy/search-entities?query=${encodeURIComponent(query)}&type=${type}`),

  // --- contracts ---
  contracts: (params?: Record<string, any>) => api.get<{ data: any[]; pagination: any }>(`/contracts${toQS(params)}`),
  contract:  (id: string) => api.get<any>(`/contracts/${id}`),
  renewContract: (id: string, data: any) => api.put(`/contracts/${id}/renew`, data),
  updateContractStatus: (id: string, data: any) => api.patch(`/contracts/${id}/status`, data),
  ackAlert: (id: string, note?: string) => api.patch(`/contracts/${id}/alerts/ack`, { note }),
  contractNotes: (id: string) => api.get<{ data: any[] }>(`/contracts/${id}/notes`),
  addContractNote: (id: string, data: any) => api.post(`/contracts/${id}/notes`, data),
  contractRenewals: (id: string) => api.get<{ data: any[] }>(`/contracts/${id}/renewals`),

  // --- notifications ---
  notifications: (unread = false) =>
    api.get<{ data: any[]; unread_count: number }>(`/notifications${unread ? '?unread=true' : ''}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  snooze: (id: string, days = 7) => api.post(`/notifications/${id}/snooze`, { days }),

  // --- reports — accept either single campId (legacy shape) or camp_ids[] ---
  reportRentRoll:    (params: { camp_ids?: string[]; campId?: string; month: number; year: number }) =>
    api.get<any>(`/reports/rent-roll${toQS(params)}`),
  reportOutstanding: (params: { camp_ids?: string[]; campId?: string; month: number; year: number }) =>
    api.get<any>(`/reports/outstanding${toQS(params)}`),
  reportSummary:     (campId: string, m: number, y: number) =>
    api.get<any>(`/reports/summary?campId=${campId}&month=${m}&year=${y}`),
  reportOccupancy:   (campId: string) =>
    api.get<any>(`/reports/occupancy?campId=${campId}`),
  reportSummaryMulti:  (params: { camp_ids?: string[]; month: number; year: number }) =>
    api.get<{ camps: any[] }>(`/reports/summary${toQS(params)}`),
  reportOccupancyMulti: (params: { camp_ids?: string[] }) =>
    api.get<{ camps: any[] }>(`/reports/occupancy${toQS(params)}`),

  // --- property types (admin) ---
  propertyTypes: () => api.get<{ data: any[] }>('/property-types'),
  propertyType:  (id: string) => api.get<any>(`/property-types/${id}`),
  createPropertyType: (data: any) => api.post('/property-types', data),
  updatePropertyType: (id: string, data: any) => api.patch(`/property-types/${id}`, data),
  deletePropertyType: (id: string) => api.delete(`/property-types/${id}`),

  // --- deposits ---
  deposits: (params?: Record<string, any>) => api.get<{ data: any[]; pagination: any }>(`/deposits${toQS(params)}`),
  deposit:  (id: string) => api.get<any>(`/deposits/${id}`),
  collectDeposit: (data: any) => api.post('/deposits', data),
  refundDeposit:  (id: string, data: any) => api.post(`/deposits/${id}/refund`, data),
  depositReceiptData: (id: string) => api.get(`/deposits/${id}/receipt-data`),

  // --- payment schedules ---
  schedules: (params?: Record<string, any>) => api.get<{ data: any[] }>(`/payment-schedules${toQS(params)}`),
  generateSchedule: (data: any) => api.post('/payment-schedules/generate', data),
  updateScheduleRow: (id: string, data: any) => api.patch(`/payment-schedules/${id}`, data),

  // --- maintenance ---
  maintenance: (params?: Record<string, any>) => api.get<{ data: any[] }>(`/maintenance${toQS(params)}`),
  maintRequest: (id: string) => api.get<any>(`/maintenance/${id}`),
  createMaint: (data: any) => api.post('/maintenance', data),
  updateMaint: (id: string, data: any) => api.patch(`/maintenance/${id}`, data),

  // --- complaints ---
  complaints: (params?: Record<string, any>) => api.get<{ data: any[] }>(`/complaints${toQS(params)}`),
  createComplaint: (data: any) => api.post('/complaints', data),
  updateComplaint: (id: string, data: any) => api.patch(`/complaints/${id}`, data),

  // --- payments ---
  payments: (params?: Record<string, any>) => api.get<{ data: any[] }>(`/payments${toQS(params)}`),
  logPayment: (data: any) => api.post('/payments', data),
  paymentReceiptData: (id: string) => api.get(`/payments/${id}/receipt-data`),

  // --- Phase 4A: lease payments & room tenants ---
  createPayment: (data: any) => api.post('/lease-payments', data),
  reversePayment: (id: string, reason: string) => api.post(`/lease-payments/${id}/reverse`, { reason }),
  leasePayments: (leaseId: string) => api.get<{ payments: any[] }>(`/lease-payments/lease/${leaseId}`),
  tenantPayments: (tenantId: string) => api.get<{ payments: any[] }>(`/lease-payments/tenant/${tenantId}`),
  roomTenants: (params?: Record<string, any>) => api.get<{ tenants: any[] }>(`/room-tenants${toQS(params)}`),
  roomTenant: (id: string) => api.get<{ tenant: any }>(`/room-tenants/${id}`),

  // --- teams (admin) ---
  teams: () => api.get<{ data: any[] }>('/teams'),
  createTeam: (data: any) => api.post('/teams', data),
  addTeamMember: (id: string, data: any) => api.post(`/teams/${id}/members`, data),
  removeTeamMember: (teamId: string, userId: string) => api.delete(`/teams/${teamId}/members/${userId}`),

  // --- users & roles (admin) ---
  users: () => api.get<{ data: any[] }>('/users'),
  inviteUser: (data: { email: string; full_name: string; role_id: string }) => api.post('/users/invite', data),
  updateUser: (id: string, data: any) => api.patch(`/users/${id}`, data),
  roles: () => api.get<{ data: any[] }>('/roles'),
  permissions: () => api.get<{ data: any[] }>('/permissions'),

  // --- tenant & settings ---
  tenant: () => api.get<any>('/tenant'),
  updateTenant: (data: any) => api.patch('/tenant', data),
  featureFlags: () => api.get<{ data: any[] }>('/feature-flags'),
  setFeatureFlag: (key: string, enabled: boolean) => api.patch(`/feature-flags/${key}`, { enabled }),

  // --- AI endpoints (from backend fix 9.x + gap-fix 2) ---
  aiClassifyComplaint: (text: string) =>
    api.post<{ category: string; priority: string; title: string }>('/ai/classify-complaint', { text }),
  aiNarrateAnomaly: (data: any) =>
    api.post<{ narration: string }>('/ai/narrate-anomaly', data),
  aiMatchEntity: (name: string, candidates: any[]) =>
    api.post<{ match_index: number | null; confidence: number; reason: string }>('/ai/match-entity', { name, candidates }),

  // --- Phase 4B: Lease creation flow ---
  createRoomTenant: (data: any) =>
    api.post<{ tenant: any; warning: any | null }>('/room-tenants', data),

  roomAvailability: (params: {
    campId?: string
    blockId?: string
    start_date: string
    end_date?: string
  }) => {
    const qs = new URLSearchParams()
    if (params.campId) qs.set('campId', params.campId)
    if (params.blockId) qs.set('blockId', params.blockId)
    qs.set('start_date', params.start_date)
    if (params.end_date) qs.set('end_date', params.end_date)
    return api.get<{ available: any[]; occupied: any[]; total_available: number; total_occupied: number }>(`/rooms/availability?${qs}`)
  },

  leases: (params?: { status?: string; scope?: 'whole_room' | 'bed_level'; q?: string; camp_id?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.scope) qs.set('scope', params.scope)
    if (params?.q) qs.set('q', params.q)
    if (params?.camp_id) qs.set('camp_id', params.camp_id)
    return api.get<{ leases: any[]; counts: any }>(`/leases${qs.toString() ? '?' + qs : ''}`)
  },

  createLease: (data: any) =>
    api.post<{ lease: any }>('/leases', data),

  activateLease: (leaseId: string) =>
    api.post<{ lease: any; scheduled_months: number; already_active: boolean }>(`/leases/${leaseId}/activate`),

  deleteDraftLease: (leaseId: string) =>
    api.delete<{ deleted: boolean }>(`/leases/${leaseId}`),

  // --- Phase 4B.5: Bed-level leasing ---
  bedspace: (bedspaceId: string) =>
    api.get<any>(`/bedspaces/${bedspaceId}`),

  // --- Phase 4C: Checkout & exit flow ---
  giveNotice: (leaseId: string, payload: {
    notice_given_date: string
    scheduled_checkout_date?: string
    notes?: string
  }) =>
    api.post<{ lease: any; already_given: boolean; notice_given_date: string; scheduled_checkout_date: string }>(
      `/leases/${leaseId}/give-notice`,
      payload
    ),

  cancelNotice: (leaseId: string) =>
    api.post<{ lease: any }>(`/leases/${leaseId}/cancel-notice`),

  checkoutLease: (leaseId: string, payload: {
    checkout_date: string
    checkout_type?: 'normal' | 'early_termination' | 'eviction'
    closure_reason: 'end_of_term' | 'mutual_early' | 'tenant_abandoned' | 'landlord_eviction' | 'legal_action' | 'other'  // Phase 4C
    inspection_notes?: string
    condition_rating?: number
    inspected_by?: string
    damages: Array<{
      category: 'wall' | 'plumbing' | 'furniture' | 'cleaning' | 'utility' | 'prorated_rent' | 'other'
      description: string
      amount: number
    }>
    refund_method?: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'adjustment'
    refund_reference?: string
    process_refund?: boolean
    checked_out_by_name?: string  // Phase 4C: renamed from processed_by
    acknowledge_early_checkout?: boolean  // Phase 4C
  }) =>
    api.post<{
      lease: any
      checkout: any
      refund_payment: any
      damages_count: number
      refund_amount: number
      additional_charges_owed: number
      already_closed: boolean
    }>(`/leases/${leaseId}/checkout`, payload),

  reverseCheckout: (leaseId: string, payload: {
    reason: string
    reversed_by?: string
  }) =>
    api.post<{ lease: any; reversed_checkout_id: string }>(
      `/leases/${leaseId}/checkout/reverse`,
      payload
    ),

  getLeaseCheckouts: (leaseId: string) =>
    api.get<{ checkouts: any[] }>(`/leases/${leaseId}/checkout`),

  checkoutPreview: (leaseId: string, checkoutDate?: string) => {
    const qs = checkoutDate ? `?checkout_date=${checkoutDate}` : ''
    return api.get<any>(`/leases/${leaseId}/checkout-preview${qs}`)
  },

  // --- Phase 4B.6: Occupant Management ---
  leaseOccupants: (leaseId: string, includeArchived = false) => {
    const qs = includeArchived ? '?include_archived=true' : ''
    return api.get<{ lease_id: string; occupants: Occupant[]; counts: { active: number; archived: number } }>(
      `/leases/${leaseId}/occupants${qs}`
    )
  },

  bedspaceOccupants: (bedspaceId: string) =>
    api.get<{ bedspace_id: string; occupants: Occupant[]; counts: { total: number; active: number; archived: number } }>(
      `/bedspaces/${bedspaceId}/occupants`
    ),

  roomOccupants: (roomId: string) =>
    api.get<{ room_id: string; roster: Array<{ bedspace_id: string; bed_number: string; active_occupant: Occupant | null }> }>(
      `/rooms/${roomId}/occupants`
    ),

  createOccupant: (leaseId: string, payload: OccupantCreatePayload) =>
    api.post<{ occupant: Occupant }>(`/leases/${leaseId}/occupants`, payload),

  archiveOccupant: (occupantId: string, payload: {
    checkout_reason: 'swap' | 'lease_ended' | 'left_voluntarily' | 'terminated' | 'other'
    checkout_notes?: string | null
    checked_out_at?: string | null
  }) =>
    api.post<{ occupant: Occupant }>(`/occupants/${occupantId}/archive`, payload),

  swapOccupants: (leaseId: string, payload: OccupantSwapPayload) =>
    api.post<{ archived: Occupant; created: Occupant }>(`/leases/${leaseId}/occupants/swap`, payload),

  peopleSearch: (query: string) =>
    api.get<{
      query: string
      results: Array<{
        type: 'tenant' | 'occupant'
        id: string
        name: string
        display_subtype: string
        national_id?: string | null
        passport_number?: string | null
        phone?: string | null
        current_bed?: string | null
        lease_id?: string
        lease_status?: string
        tenant_id?: string
        lessee_name?: string | null
      }>
      counts: { total: number; tenants: number; occupants: number }
    }>(`/people/search?q=${encodeURIComponent(query)}`),
}
