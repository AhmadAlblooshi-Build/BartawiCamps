import axios from 'axios'
import type {
  Camp, Building, Room, MonthlyRecord, Payment,
  Complaint, DashboardData, PaginatedResponse,
  PaymentFormData, ComplaintFormData, RoomFilters, RecordFilters
} from './types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'bartawi',  // hardcoded until auth is built
  },
  timeout: 10000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

// ── CAMPS ──────────────────────────────────────────────────────
export const campsApi = {
  list: async (): Promise<Camp[]> => {
    const { data } = await api.get('/camps')
    return data.data || data
  },

  dashboard: async (
    campId: string,
    month: number,
    year: number
  ): Promise<DashboardData> => {
    const { data } = await api.get(`/camps/${campId}/dashboard`, {
      params: { month, year }
    })
    return data
  },

  buildings: async (campId: string): Promise<Building[]> => {
    const { data } = await api.get(`/camps/${campId}/buildings`)
    return data.data || data
  },

  rooms: async (
    campId: string,
    filters?: RoomFilters
  ): Promise<PaginatedResponse<Room>> => {
    const { data } = await api.get(`/camps/${campId}/rooms`, {
      params: {
        ...(filters?.blockCode    && { block_code: filters.blockCode }),
        ...(filters?.status       && { status: filters.status }),
        ...(filters?.has_balance  && { has_balance: 'true' }),
        ...(filters?.room_type    && { room_type: filters.room_type }),
        ...(filters?.search       && { search: filters.search }),
        limit: 100,
      }
    })
    return data
  },
}

// ── ROOMS ──────────────────────────────────────────────────────
export const roomsApi = {
  get: async (roomId: string): Promise<Room> => {
    const { data } = await api.get(`/rooms/${roomId}`)
    return data
  },
}

// ── MONTHLY RECORDS ────────────────────────────────────────────
export const recordsApi = {
  list: async (filters: RecordFilters): Promise<PaginatedResponse<MonthlyRecord>> => {
    const { data } = await api.get('/monthly-records', {
      params: {
        ...(filters.campId      && { camp_id: filters.campId }),
        ...(filters.month       && { month: filters.month }),
        ...(filters.year        && { year: filters.year }),
        ...(filters.has_balance && { has_balance: 'true' }),
        page:  filters.page  || 1,
        limit: filters.limit || 50,
      }
    })
    return data
  },
}

// ── PAYMENTS ───────────────────────────────────────────────────
export const paymentsApi = {
  create: async (payload: PaymentFormData): Promise<Payment> => {
    const { data } = await api.post('/payments', payload)
    return data
  },

  list: async (filters?: {
    campId?: string
    roomId?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Payment>> => {
    const { data } = await api.get('/payments', { params: filters })
    return data
  },
}

// ── COMPLAINTS ─────────────────────────────────────────────────
export const complaintsApi = {
  list: async (filters?: {
    campId?: string
    status?: string
    priority?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Complaint>> => {
    const { data } = await api.get('/complaints', { params: filters })
    return data
  },

  create: async (payload: ComplaintFormData): Promise<Complaint> => {
    const { data } = await api.post('/complaints', payload)
    return data
  },

  updateStatus: async (id: string, status: string, note?: string): Promise<Complaint> => {
    const { data } = await api.patch(`/complaints/${id}/status`, { status, note })
    return data
  },
}

// ── OCCUPANCY ─────────────────────────────────────────────────────────────
export const occupancyApi = {
  checkout: async (data: any) => {
    const { data: res } = await api.post('/occupancy/checkout', data)
    return res
  },
  checkin: async (data: any) => {
    const { data: res } = await api.post('/occupancy/checkin', data)
    return res
  },
}

// ── CONTRACTS ─────────────────────────────────────────────────────────────
export const contractsApi = {
  list: async (filters?: { campId?: string; status?: string }) => {
    const { data } = await api.get('/contracts', {
      params: {
        ...(filters?.campId  ? { campId:  filters.campId  } : {}),
        ...(filters?.status  ? { status:  filters.status  } : {}),
      }
    })
    return data
  },

  renew: async (id: string, payload: { new_end_date: string; new_monthly_rent?: number }) => {
    const { data } = await api.post(`/contracts/${id}/renew`, payload)
    return data
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/contracts/${id}/status`, { status })
    return data
  },

  addNote: async (id: string, note: string) => {
    const { data } = await api.post(`/contracts/${id}/notes`, { note })
    return data
  },
}

// ── REPORTS ───────────────────────────────────────────────────────────────
export const reportsApi = {
  rentRoll: async (campId: string, month: number, year: number) => {
    const { data } = await api.get('/reports/rent-roll', { params: { campId, month, year } })
    return data
  },
  occupancy: async (campId: string) => {
    const { data } = await api.get('/reports/occupancy', { params: { campId } })
    return data
  },
  outstanding: async (campId: string, month: number, year: number) => {
    const { data } = await api.get('/reports/outstanding', { params: { campId, month, year } })
    return data
  },
  summary: async (campId: string, month: number, year: number) => {
    const { data } = await api.get('/reports/summary', { params: { campId, month, year } })
    return data
  },
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
export const notificationsApi = {
  list: async () => {
    const { data } = await api.get('/notifications')
    return data
  },
  markRead: async (id: string) => {
    const { data } = await api.post(`/notifications/${id}/mark-read`)
    return data
  },
  markAllRead: async () => {
    const { data } = await api.post('/notifications/mark-all-read')
    return data
  },
  snooze: async (id: string) => {
    const { data } = await api.post(`/notifications/${id}/snooze`)
    return data
  },
}

export default api
