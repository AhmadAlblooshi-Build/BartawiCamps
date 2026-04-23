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

/**
 * Invalidates ALL query keys affected by a lease write operation.
 * Use this from any component that creates/activates/deletes leases.
 *
 * Phase 4B: Lease creation affects room availability, camp occupancy,
 * dashboard stats, tenant lists, and payment schedules. This helper
 * ensures consistent cache invalidation across the wizard.
 */
export function invalidateLeaseCaches(
  queryClient: QueryClient,
  context: {
    roomId?: string
    campId?: string
    tenantId?: string
    leaseId?: string
    bedspaceId?: string  // Phase 4B.5
  }
) {
  const { roomId, campId, tenantId, leaseId, bedspaceId } = context
  const opts = { refetchType: 'all' as const }

  // ── Rooms (availability changes) ──
  queryClient.invalidateQueries({ queryKey: ['rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['rooms-for-map'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms-mini'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['room-availability'], ...opts })

  // ── Single room caches ──
  if (roomId) {
    queryClient.invalidateQueries({ queryKey: ['room', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-history', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-balance', roomId], ...opts })
  }

  // ── Camps (occupancy stats) ──
  queryClient.invalidateQueries({ queryKey: ['camps'], ...opts })
  if (campId) {
    queryClient.invalidateQueries({ queryKey: ['camp', campId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['camp-latest-month', campId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['camp-summary'], ...opts })
    queryClient.invalidateQueries({ queryKey: ['camp-occupancy'], ...opts })
  }

  // ── Dashboard aggregates ──
  queryClient.invalidateQueries({ queryKey: ['all-summaries'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['outstanding-leaderboard'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['trend-12mo'], ...opts })

  // ── Tenants & leases ──
  queryClient.invalidateQueries({ queryKey: ['room-tenants'], ...opts })
  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-tenant', tenantId], ...opts })
  }
  if (leaseId) {
    queryClient.invalidateQueries({ queryKey: ['lease', leaseId], ...opts })
  }

  // ── Payment schedules ──
  queryClient.invalidateQueries({ queryKey: ['payment-schedules'], ...opts })

  // ── Phase 4B.5: Bedspaces (bed-level leases) ──
  queryClient.invalidateQueries({ queryKey: ['bedspace'], ...opts })
  if (bedspaceId) {
    queryClient.invalidateQueries({ queryKey: ['bedspace', bedspaceId], ...opts })
  }
}

/**
 * Invalidates ALL query keys affected by a checkout operation.
 * Use this from CheckoutWizard and related components.
 *
 * Phase 4C: Checkout affects lease status, room availability, tenant records,
 * payment history, dashboard stats, and operations queue. This helper ensures
 * consistent cache invalidation across all checkout flows.
 */
export function invalidateCheckoutCaches(
  queryClient: QueryClient,
  context: {
    leaseId: string
    roomId?: string
    bedspaceId?: string | null
    tenantId?: string
    campId?: string
  }
) {
  const opts = { refetchType: 'all' as const }
  const { leaseId, roomId, bedspaceId, tenantId, campId } = context

  // ── Leases (status changes) ──
  queryClient.invalidateQueries({ queryKey: ['leases'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['lease', leaseId], ...opts })
  queryClient.invalidateQueries({ queryKey: ['lease-checkouts', leaseId], ...opts })
  queryClient.invalidateQueries({ queryKey: ['lease-payments', leaseId], ...opts })

  // ── Rooms (availability changes) ──
  queryClient.invalidateQueries({ queryKey: ['rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['rooms-for-map'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['room-availability'], ...opts })

  if (roomId) {
    queryClient.invalidateQueries({ queryKey: ['room', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-history', roomId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-balance', roomId], ...opts })
  }

  // ── Bedspaces (bed-level checkout) ──
  if (bedspaceId) {
    queryClient.invalidateQueries({ queryKey: ['bedspace', bedspaceId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['bedspace'], ...opts })
  }

  // ── Tenants (checkout history) ──
  if (tenantId) {
    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['room-tenant', tenantId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['tenant-payments', tenantId], ...opts })
  }

  // ── Camps (occupancy stats) ──
  queryClient.invalidateQueries({ queryKey: ['camps'], ...opts })
  if (campId) {
    queryClient.invalidateQueries({ queryKey: ['camp', campId], ...opts })
    queryClient.invalidateQueries({ queryKey: ['camp-occupancy'], ...opts })
    queryClient.invalidateQueries({ queryKey: ['camp-summary'], ...opts })
  }

  // ── Operations queue (notice-given tab) ──
  queryClient.invalidateQueries({ queryKey: ['operations'], ...opts })

  // ── Dashboard (aggregate stats) ──
  queryClient.invalidateQueries({ queryKey: ['dashboard'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['all-summaries'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['outstanding-leaderboard'], ...opts })
}

/**
 * Invalidates ALL query keys affected by occupant write operations.
 * Use this from any component that creates/archives/swaps occupants.
 *
 * Phase 4B.6: Occupant operations affect lease status, bedspace availability,
 * room roster, checkout preview, and people search. This helper ensures
 * consistent cache invalidation across all occupant management flows.
 */
export function invalidateOccupantCaches(
  queryClient: QueryClient,
  context: {
    leaseId: string
    bedspaceId?: string
    roomId?: string
  }
) {
  const opts = { refetchType: 'all' as const }
  const { leaseId, bedspaceId, roomId } = context

  // ── Occupant-specific caches ──
  queryClient.invalidateQueries({ queryKey: ['lease-occupants', leaseId], ...opts })
  if (bedspaceId) {
    queryClient.invalidateQueries({ queryKey: ['bedspace-occupants', bedspaceId], ...opts })
  }
  if (roomId) {
    queryClient.invalidateQueries({ queryKey: ['room-occupants', roomId], ...opts })
  }

  // ── Lease (occupant_count field) ──
  queryClient.invalidateQueries({ queryKey: ['lease', leaseId], ...opts })
  queryClient.invalidateQueries({ queryKey: ['leases'], ...opts })

  // ── Bedspace (occupancy status) ──
  if (bedspaceId) {
    queryClient.invalidateQueries({ queryKey: ['bedspace', bedspaceId], ...opts })
  }
  queryClient.invalidateQueries({ queryKey: ['bedspace'], ...opts })

  // ── Room (roster view) ──
  if (roomId) {
    queryClient.invalidateQueries({ queryKey: ['room', roomId], ...opts })
  }

  // ── Checkout preview (occupants_to_archive field) ──
  queryClient.invalidateQueries({ queryKey: ['checkout-preview', leaseId], ...opts })

  // ── People search (merged tenant + occupant results) ──
  queryClient.invalidateQueries({ queryKey: ['people-search'], ...opts })

  // ── Map views (room tiles show occupant counts) ──
  queryClient.invalidateQueries({ queryKey: ['rooms-for-map'], ...opts })
  queryClient.invalidateQueries({ queryKey: ['camp-rooms'], ...opts })
}
