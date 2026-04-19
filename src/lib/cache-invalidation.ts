import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidates ALL query keys affected by a payment write operation.
 * Use this from any component that creates/reverses payments.
 *
 * Centralized so future write operations don't need to remember
 * the full list of affected caches.
 *
 * Phase 4A: Discovered via comprehensive audit that payment operations
 * affect 25+ different query keys across rooms, camps, dashboard, and
 * tenant data. This helper ensures we never miss a key again.
 */
export function invalidatePaymentCaches(
  queryClient: QueryClient,
  context: {
    roomId?: string
    leaseId?: string
    tenantId?: string
  }
) {
  const { roomId, leaseId, tenantId } = context
  const opts = { refetchType: 'all' as const }

  // ── Rooms (all variants) ──
  queryClient.invalidateQueries({ queryKey: ['rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['rooms-for-map'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms-mini'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['search-rooms'], ...opts })

  // ── Single room caches (only if we know the room) ──
  if (roomId) {
    queryClient.invalidateQueries({ queryKey: ['room', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-history', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-balance', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-deposits', roomId], ...opts })
  }

  // ── Camps ──
  queryClient.invalidateQueries({ queryKey: ['camps'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-latest-month'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-summary'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-occupancy'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-pivot'], ...opts })

  // ── Dashboard aggregates ──
  queryClient.invalidateQueries({ queryKey: ['all-summaries'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['outstanding-leaderboard'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['trend-12mo'], ...opts })

  // ── Tenants & leases ──
  queryClient.invalidateQueries({ queryKey: ['room-tenants'], ...opts })
  if (leaseId) {
    queryClient.invalidateQueries({ queryKey: ['lease-payments', leaseId], ...opts })
  }
  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['tenant-payments', tenantId], ...opts })
  }
}
