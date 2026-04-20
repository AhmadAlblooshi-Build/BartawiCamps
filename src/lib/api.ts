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

  leases: (params?: { status?: string; q?: string; camp_id?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
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
}
