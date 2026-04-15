import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campsApi, roomsApi, recordsApi, paymentsApi, complaintsApi, occupancyApi, contractsApi, reportsApi, notificationsApi } from './api'
import type { PaymentFormData, ComplaintFormData, RoomFilters, RecordFilters } from './types'

// ── CAMPS ──────────────────────────────────────────────────────
export function useCamps() {
  return useQuery({
    queryKey: ['camps'],
    queryFn: campsApi.list,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboard(campId: string | null, month: number, year: number) {
  return useQuery({
    queryKey: ['dashboard', campId, month, year],
    queryFn: () => campsApi.dashboard(campId!, month, year),
    enabled: !!campId,
    staleTime: 60 * 1000,
  })
}

export function useBuildings(campId: string | null) {
  return useQuery({
    queryKey: ['buildings', campId],
    queryFn: () => campsApi.buildings(campId!),
    enabled: !!campId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRooms(campId: string | null, filters?: RoomFilters) {
  return useQuery({
    queryKey: ['rooms', campId, filters],
    queryFn: () => campsApi.rooms(campId!, filters),
    enabled: !!campId,
    staleTime: 60 * 1000,
  })
}

// ── ROOMS ──────────────────────────────────────────────────────
export function useRoom(roomId: string | null) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.get(roomId!),
    enabled: !!roomId,
    staleTime: 30 * 1000,
  })
}

// ── MONTHLY RECORDS ────────────────────────────────────────────
export function useMonthlyRecords(filters: RecordFilters) {
  return useQuery({
    queryKey: ['monthly-records', filters],
    queryFn: () => recordsApi.list(filters),
    enabled: !!filters.campId,
    staleTime: 60 * 1000,
  })
}

// ── PAYMENTS ───────────────────────────────────────────────────
export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentFormData) => paymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-records'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['room'] })
    },
  })
}

// ── COMPLAINTS ─────────────────────────────────────────────────
export function useComplaints(filters?: { campId?: string; status?: string }) {
  return useQuery({
    queryKey: ['complaints', filters],
    queryFn: () => complaintsApi.list(filters),
    staleTime: 30 * 1000,
  })
}

export function useCreateComplaint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ComplaintFormData) => complaintsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }) },
  })
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      complaintsApi.updateStatus(id, status, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complaints'] }) },
  })
}

// ── OCCUPANCY ─────────────────────────────────────────────────────────────
export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => occupancyApi.checkout(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-records'] })
    },
  })
}

export function useCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => occupancyApi.checkin(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-records'] })
    },
  })
}

// ── CONTRACTS ─────────────────────────────────────────────────────────────
export function useContracts(filters?: { campId?: string; status?: string }) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractsApi.list(filters),
    staleTime: 30 * 1000,
  })
}

export function useRenewContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; new_end_date: string; new_monthly_rent?: number }) =>
      contractsApi.renew(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useUpdateContractStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      contractsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })
}

export function useSnoozeNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.snooze(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })
}
