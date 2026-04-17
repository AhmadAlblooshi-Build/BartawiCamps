'use client'
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { endpoints } from './api'
import { toast } from 'sonner'
import { getCurrentMonthYear } from './utils'

/* ============================================================
   QUERIES
   ============================================================ */

// Camps
export const useCamps = () => useQuery({
  queryKey: ['camps'],
  queryFn: () => endpoints.camps(),
  staleTime: 60_000,
})

export const useCamp = (campId: string) => useQuery({
  queryKey: ['camp', campId],
  queryFn: () => endpoints.camp(campId),
  enabled: Boolean(campId),
})

// Rooms
export const useRooms = (filters?: any) => useQuery({
  queryKey: ['rooms', filters],
  queryFn: () => endpoints.rooms({ limit: 500, ...filters }),
})

export const useRoom = (roomId: string) => useQuery({
  queryKey: ['room', roomId],
  queryFn: () => endpoints.room(roomId),
  enabled: Boolean(roomId),
})

export const useRoomHistory = (roomId: string) => useQuery({
  queryKey: ['room-history', roomId],
  queryFn: () => endpoints.roomHistory(roomId),
  enabled: Boolean(roomId),
})

export const useRoomBalance = (roomId: string) => useQuery({
  queryKey: ['room-balance', roomId],
  queryFn: () => endpoints.roomBalance(roomId),
  enabled: Boolean(roomId),
})

// Contracts
export const useContracts = (filters?: any) => useQuery({
  queryKey: ['contracts', filters],
  queryFn: () => endpoints.contracts({ limit: 200, ...filters }),
})

export const useContractNotes = (contractId: string) => useQuery({
  queryKey: ['contract-notes', contractId],
  queryFn: () => endpoints.contractNotes(contractId),
  enabled: Boolean(contractId),
})

// Payments
export const usePayments = (filters?: any) => useQuery({
  queryKey: ['payments', filters],
  queryFn: () => endpoints.payments({ limit: 100, ...filters }),
})

export const useReceiptData = (paymentId: string) => useQuery({
  queryKey: ['receipt', paymentId],
  queryFn: () => endpoints.paymentReceiptData(paymentId),
  enabled: Boolean(paymentId),
})

// Complaints
export const useComplaints = (filters?: any) => useQuery({
  queryKey: ['complaints', filters],
  queryFn: () => endpoints.complaints({ limit: 100, ...filters }),
})

// Maintenance
export const useMaintenance = (filters?: any) => useQuery({
  queryKey: ['maintenance', filters],
  queryFn: () => endpoints.maintenance({ limit: 100, ...filters }),
})

// Notifications
export const useNotifications = () => useQuery({
  queryKey: ['notifications'],
  queryFn: () => endpoints.notifications(),
  refetchInterval: 60_000,
})

// Admin: Users & Roles
export const useUsers = () => useQuery({
  queryKey: ['users'],
  queryFn: () => endpoints.users(),
})

export const useRoles = () => useQuery({
  queryKey: ['roles'],
  queryFn: () => endpoints.roles(),
})

// Admin: Teams
export const useTeams = () => useQuery({
  queryKey: ['teams'],
  queryFn: () => endpoints.teams(),
})

// Admin: Property Types
export const usePropertyTypes = () => useQuery({
  queryKey: ['property-types'],
  queryFn: () => endpoints.propertyTypes(),
})

// Admin: Settings
export const useTenant = () => useQuery({
  queryKey: ['tenant'],
  queryFn: () => endpoints.tenant(),
})

export const useFeatureFlags = () => useQuery({
  queryKey: ['feature-flags'],
  queryFn: () => endpoints.featureFlags(),
})

// Reports
export const useCampSummary = (campId: string, month?: number, year?: number) => {
  const { month: cm, year: cy } = getCurrentMonthYear()
  const m = month ?? cm, y = year ?? cy
  return useQuery({
    queryKey: ['camp-summary', campId, m, y],
    queryFn: () => endpoints.reportSummary(campId, m, y),
    enabled: Boolean(campId),
  })
}

/* ============================================================
   MUTATIONS
   ============================================================ */

// Note: Existing components use inline useMutation calls.
// These consolidated hooks are for future refactoring.
// Do not modify existing components to use these in this session.

export function useInvalidateQueries() {
  const qc = useQueryClient()
  return {
    invalidateCamps: () => qc.invalidateQueries({ queryKey: ['camps'] }),
    invalidateRooms: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
    invalidateContracts: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
    invalidatePayments: () => qc.invalidateQueries({ queryKey: ['payments'] }),
    invalidateAll: () => qc.invalidateQueries(),
  }
}
