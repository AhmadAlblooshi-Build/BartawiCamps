'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import {
  getTenantName,
  getCompanyName,
  getPeopleCount,
  getMonthlyRent,
  getRoomStatus,
  getBalance,
  getPaid,
  getMobile,
  getNationality,
  getCheckInDate,
  getContractType,
  getCurrentMonthLabel,
  getRemarks,
  getPaymentStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/room-helpers'
import { getContractInfo, formatDateShort } from '@/lib/contract-helpers'
import { formatMethod, formatDateLong, type PaymentMethod } from '@/lib/payment-helpers'
import { LogPaymentDialog } from '@/components/payments/LogPaymentDialog'
import CreateLeaseWizard from '@/components/leases/CreateLeaseWizard'
import CheckoutWizard from '@/components/leases/CheckoutWizard'
import BedInterior from '@/components/map/BedInterior'
import { CaretLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface RoomInteriorProps {
  room: any
  onBack: () => void
}

export function RoomInterior({ room, onBack }: RoomInteriorProps) {
  if (!room) {
    return (
      <div className="p-12 text-center">
        <p className="font-serif italic text-[18px] text-espresso mb-2">No room data</p>
        <button onClick={onBack} className="px-4 py-2 bg-amber text-sand rounded-full text-[12px]">
          ← Back
        </button>
      </div>
    )
  }

  const roomCode = room.room_number
  const blockCode = room.block?.code

  // Fetch room history and balance
  const { data: balanceData } = useQuery({
    queryKey: ['room-balance', room.id],
    queryFn: () => endpoints.roomBalance(room.id),
    enabled: !!room.id,
  })

  const { data: historyData } = useQuery({
    queryKey: ['room-history', room.id],
    queryFn: () => endpoints.roomHistory(room.id),
    enabled: !!room.id,
  })

  // Fetch payment history for active lease
  const leaseId = room.current_month?.lease_id || room.active_lease?.id
  const { data: paymentsData } = useQuery({
    queryKey: ['lease-payments', leaseId],
    queryFn: () => endpoints.leasePayments(leaseId),
    enabled: !!leaseId,
  })

  const contract = getContractInfo(room)
  const status = getRoomStatus(room)
  const companyName = getCompanyName(room)
  const tenantName = getTenantName(room)
  const displayTenantName = companyName || tenantName || '—'
  const peopleCount = getPeopleCount(room)
  const maxCapacity = Math.max(
    Number(room?.max_capacity) || peopleCount || 8,
    peopleCount || 8,
    8
  )
  const rent = getMonthlyRent(room)
  const balance = getBalance(room)
  const paid = getPaid(room)
  const remarks = getRemarks(room)
  const mobile = getMobile(room) || '—'
  const nationality = getNationality(room) || '—'
  const checkIn = getCheckInDate(room) || '—'
  const contractType = getContractType(room) || 'Monthly'
  const monthLabel = getCurrentMonthLabel(room)
  const isPaid = balance === 0 && rent > 0

  // Payment status for visualization
  const paymentStatus = getPaymentStatus(room)
  const statusColor = STATUS_COLORS[paymentStatus]
  const statusLabel = STATUS_LABELS[paymentStatus]

  const isBartawi = ['Bartawi', 'bartawi_use'].includes(status) ||
                    ['A-17', 'A-18', 'A-19', 'C-11', 'C-20', 'D-1'].includes(roomCode)

  // Vacancy check for "Lease this room" button
  const isVacant = !room?.active_lease && !room?.current_month?.tenant
  const canLease = isVacant && !isBartawi

  // Payment capabilities
  const hasActiveLease = !!(room.active_lease?.id || room.current_month?.lease_id)
  const canLogRent = hasActiveLease && balance > 0
  const depositRemaining = (room.active_lease?.deposit_amount || 0) - (room.active_lease?.deposit_paid || 0)
  const canLogDeposit = hasActiveLease && depositRemaining > 0

  const handleOpenPaymentDialog = (type: 'rent' | 'deposit') => {
    setPaymentType(type)
    setPaymentDialogOpen(true)
  }

  // Hover states for action buttons
  const [hoverLogPayment, setHoverLogPayment] = useState(false)
  const [hoverGiveNotice, setHoverGiveNotice] = useState(false)
  const [hoverNewLease, setHoverNewLease] = useState(false)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<'rent' | 'deposit'>('rent')

  // Lease wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [prefilledBedspaceId, setPrefilledBedspaceId] = useState<string | null>(null)
  const [openedBedspaceId, setOpenedBedspaceId] = useState<string | null>(null)

  // Checkout wizard state
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Phase 4B.5: Real bedspace data from API (bedspaces_state)
  const bedspaces = (room?.bedspaces_state || []).slice().sort(
    (a: any, b: any) => a.bed_number - b.bed_number
  )

  // Fallback: if bedspaces_state is empty (pre-4B.5 data or Bartawi),
  // use the existing static logic to preserve visuals
  const useStaticFallback = bedspaces.length === 0

  // Wall assignment: left gets ceiling when odd
  // 1 bed → left[1], right[]
  // 2 beds → left[1], right[2]
  // 3 beds → left[1,2], right[3]
  // 7 beds → left[1,2,3,4], right[5,6,7]  ← matches Ahmad's screenshot
  // 8 beds → left[1-4], right[5-8]
  // 12 beds → left[1-6], right[7-12]
  const leftCount = Math.ceil(bedspaces.length / 2)
  const leftBeds = bedspaces.slice(0, leftCount)
  const rightBeds = bedspaces.slice(leftCount)

  // Keep existing static fallback variables for rooms without bedspaces_state
  const bedsPerWall = Math.ceil(maxCapacity / 2)
  const staticLeftBeds = Array.from({ length: bedsPerWall }).map((_, i) => ({
    id: `B${i + 1}`,
    occupied: i < Math.min(peopleCount, bedsPerWall),
  }))
  const staticRightBeds = Array.from({ length: bedsPerWall }).map((_, i) => ({
    id: `B${i + bedsPerWall + 1}`,
    occupied: i < Math.max(0, peopleCount - bedsPerWall),
  }))

  // Phase 4B.5: Use actual bed count for spacing when real data available
  const activeBedsPerWall = useStaticFallback
    ? bedsPerWall
    : Math.max(leftBeds.length, rightBeds.length, 1)

  const roomViewBoxHeight = Math.max(420, 60 + activeBedsPerWall * 75)
  const bedSpacing = activeBedsPerWall > 4 ? 55 : 72

  // Phase 4B.5: Desert Noir bed state colors — map payment_status to fill/stroke
  const BED_FILL = {
    paid: '#1E4D52',        // teal
    partial: '#B8883D',     // amber
    unpaid: '#A84A3B',      // rust
    whole_room: '#1A1816',  // espresso
    vacant: 'transparent',
  } as const

  const BED_STROKE = {
    paid: '#0D2A2D',
    partial: '#8B6420',
    unpaid: '#6E2E22',
    whole_room: '#0D0C0B',
    vacant: '#B8883D',      // amber dashed outline
  } as const

  type BedStatus = keyof typeof BED_FILL

  const getBedColors = (bed: any) => {
    const status: BedStatus = (bed?.payment_status || 'vacant') as BedStatus
    return {
      fill: BED_FILL[status] ?? BED_FILL.vacant,
      stroke: BED_STROKE[status] ?? BED_STROKE.vacant,
      isDashed: status === 'vacant',
      status,
    }
  }

  const getBedLabel = (bed: any) => {
    if (!bed?.tenant) return 'vacant'
    const name = bed.tenant.display_name || 'Unknown'
    // First word, capped at 10 chars to fit bed rect
    return name.split(' ')[0].substring(0, 10)
  }

  const handleBedClick = (bed: any, e: React.MouseEvent) => {
    e.stopPropagation()  // CRITICAL — prevent room-level click bubble

    // Whole-room leased → bed clicks are no-ops (the room detail
    // is already the current view, so nothing to open)
    if (room?.has_room_level_lease) {
      return
    }

    // Occupied bed → open BedInterior detail panel
    if (bed?.status === 'occupied' || bed?.tenant) {
      setOpenedBedspaceId(bed.bedspace_id)
      return
    }

    // Vacant bed → open wizard prefilled with bedspace_id
    setPrefilledBedspaceId(bed.bedspace_id)
    setWizardOpen(true)
  }

  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start px-6 pt-6 pb-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-amber hover:text-amber/80 mb-2 transition-colors"
          >
            <CaretLeft size={12} weight="light" />
            Back to Block {blockCode}
          </button>
          <p className="font-serif text-[30px] italic text-espresso leading-tight">
            Room {roomCode}
          </p>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            Block {blockCode} · Ground floor · {peopleCount}/{maxCapacity} beds · {contractType}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isPaid && contract.status !== 'expired' && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(30, 77, 82, 0.12)',
                color: '#1E4D52',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Paid
            </span>
          )}
          {balance > 0 && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(168, 74, 59, 0.12)',
                color: '#A84A3B',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Outstanding
            </span>
          )}
          {contract.status === 'expired' && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(139, 100, 32, 0.12)',
                color: '#8B6420',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Expired
            </span>
          )}
          {contract.status === 'expiring_soon' && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(184, 136, 61, 0.15)',
                color: '#B8883D',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Expiring
            </span>
          )}
          {contract.hasLegalIssue && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(26, 24, 22, 0.1)',
                color: '#1A1816',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Legal
            </span>
          )}
          {isBartawi && (
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(184, 136, 61, 0.12)',
                color: '#B8883D',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ● Bartawi
            </span>
          )}
        </div>
      </div>

      {/* Main grid: room drawing on left, data panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 px-6 pb-6">
        {/* ROOM INTERIOR SVG */}
        <motion.div
          layoutId={`room-${roomCode}`}
          className="bg-paper rounded-xl border border-dust p-6"
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        >
          <svg
            viewBox={`0 0 480 ${roomViewBoxHeight}`}
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            {/* Room floor */}
            <rect
              x="40"
              y="30"
              width="400"
              height={roomViewBoxHeight - 80}
              fill="#F4EFE7"
              stroke="#1A1816"
              strokeWidth="1.5"
              rx="3"
            />

            {/* Window at top wall */}
            <rect
              x="200"
              y="25"
              width="80"
              height="10"
              fill="#D8E3E4"
              stroke="#1A1816"
              strokeWidth="1"
            />
            <line x1="220" y1="25" x2="220" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <line x1="240" y1="25" x2="240" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <line x1="260" y1="25" x2="260" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <text
              x="240"
              y="18"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              window
            </text>

            {/* Door at bottom wall with swing arc */}
            <rect
              x="210"
              y="365"
              width="60"
              height="10"
              fill="#E8E0D6"
              stroke="#1A1816"
              strokeWidth="1"
            />
            <path
              d="M 270 375 Q 270 335 230 335"
              fill="none"
              stroke="#9C948B"
              strokeWidth="0.6"
              strokeDasharray="3 3"
            />
            <text
              x="240"
              y="395"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              door
            </text>

            {/* LEFT WALL beds */}
            {!useStaticFallback ? (
              // Phase 4B.5: Real bedspace data
              leftBeds.map((bed: any, idx: number) => {
                const colors = getBedColors(bed)
                const label = getBedLabel(bed)
                const isVacant = colors.isDashed
                const isWholeRoom = bed?.payment_status === 'whole_room'
                const yPos = 60 + idx * bedSpacing

                return (
                  <g
                    key={bed.bedspace_id}
                    className={`transition-all duration-150 ${
                      isWholeRoom ? '' : 'cursor-pointer hover:opacity-80'
                    }`}
                    onClick={(e) => handleBedClick(bed, e)}
                  >
                    {/* Bed rect */}
                    <rect
                      x="60"
                      y={yPos}
                      width="120"
                      height={bedSpacing - 20}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isVacant ? 1 : 0.8}
                      strokeDasharray={isVacant ? '4 3' : undefined}
                      rx="2"
                    />

                    {/* Pillow — only for non-vacant beds */}
                    {!isVacant && (
                      <rect
                        x="66"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="#F4EFE7"
                        rx="1.5"
                        opacity="0.9"
                      />
                    )}

                    {/* Tenant name or 'vacant' */}
                    <text
                      x="130"
                      y={yPos + (bedSpacing - 20) / 2 + 4}
                      textAnchor="middle"
                      fontFamily="Geist, Inter, sans-serif"
                      fontSize="13"
                      fontWeight={isVacant ? '400' : '500'}
                      fontStyle={isVacant ? 'italic' : 'normal'}
                      fill={isVacant ? '#B8883D' : '#F4EFE7'}
                    >
                      {label}
                    </text>

                    {/* BED N small label */}
                    <text
                      x="130"
                      y={yPos + (bedSpacing - 20) / 2 + 18}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      fill={isVacant ? '#9C948B' : '#9FE1CB'}
                      letterSpacing="1"
                    >
                      BED {bed.bed_number}
                    </text>
                  </g>
                )
              })
            ) : (
              // FALLBACK: Static rendering for Bartawi/pre-4B.5 rooms
              staticLeftBeds.map((bed, idx) => {
                const yPos = 60 + idx * bedSpacing
                return (
                  <g key={bed.id}>
                    {bed.occupied ? (
                      <>
                        <rect
                          x="60"
                          y={yPos}
                          width="120"
                          height={bedSpacing - 20}
                          fill="#1E4D52"
                          stroke="#0D2A2D"
                          strokeWidth="0.8"
                          rx="2"
                        />
                        <rect
                          x="66"
                          y={yPos + 6}
                          width="30"
                          height="18"
                          fill="#F4EFE7"
                          rx="1.5"
                        />
                        <text
                          x="130"
                          y={yPos + (bedSpacing - 20) / 2 + 4}
                          textAnchor="middle"
                          fontFamily="Geist, Inter, sans-serif"
                          fontSize="13"
                          fontWeight="500"
                          fill="#F4EFE7"
                        >
                          {idx === 0 && displayTenantName !== '—'
                            ? displayTenantName.split(' ')[0].substring(0, 10)
                            : `Person ${idx + 1}`}
                        </text>
                        <text
                          x="130"
                          y={yPos + (bedSpacing - 20) / 2 + 18}
                          textAnchor="middle"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="9"
                          fill="#9FE1CB"
                          letterSpacing="1"
                        >
                          BED {bed.id.substring(1)}
                        </text>
                      </>
                    ) : (
                      <>
                        <rect
                          x="60"
                          y={yPos}
                          width="120"
                          height={bedSpacing - 20}
                          fill="none"
                          stroke="#B8883D"
                          strokeWidth="1"
                          strokeDasharray="4 3"
                          rx="2"
                        />
                        <rect
                          x="66"
                          y={yPos + 6}
                          width="30"
                          height="18"
                          fill="none"
                          stroke="#B8883D"
                          strokeWidth="0.6"
                          strokeDasharray="2 2"
                          rx="1.5"
                        />
                        <text
                          x="130"
                          y={yPos + (bedSpacing - 20) / 2 + 6}
                          textAnchor="middle"
                          fontFamily="Geist, Inter, sans-serif"
                          fontSize="12"
                          fontStyle="italic"
                          fill="#B8883D"
                        >
                          vacant
                        </text>
                      </>
                    )}
                  </g>
                )
              })
            )}

            {/* RIGHT WALL beds */}
            {!useStaticFallback ? (
              // Phase 4B.5: Real bedspace data
              rightBeds.map((bed: any, idx: number) => {
                const colors = getBedColors(bed)
                const label = getBedLabel(bed)
                const isVacant = colors.isDashed
                const isWholeRoom = bed?.payment_status === 'whole_room'
                const yPos = 60 + idx * bedSpacing

                return (
                  <g
                    key={bed.bedspace_id}
                    className={`transition-all duration-150 ${
                      isWholeRoom ? '' : 'cursor-pointer hover:opacity-80'
                    }`}
                    onClick={(e) => handleBedClick(bed, e)}
                  >
                    {/* Bed rect */}
                    <rect
                      x="300"
                      y={yPos}
                      width="120"
                      height={bedSpacing - 20}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isVacant ? 1 : 0.8}
                      strokeDasharray={isVacant ? '4 3' : undefined}
                      rx="2"
                    />

                    {/* Pillow — only for non-vacant beds */}
                    {!isVacant && (
                      <rect
                        x="384"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="#F4EFE7"
                        rx="1.5"
                        opacity="0.9"
                      />
                    )}

                    {/* Tenant name or 'vacant' */}
                    <text
                      x="360"
                      y={yPos + (bedSpacing - 20) / 2 + 4}
                      textAnchor="middle"
                      fontFamily="Geist, Inter, sans-serif"
                      fontSize="13"
                      fontWeight={isVacant ? '400' : '500'}
                      fontStyle={isVacant ? 'italic' : 'normal'}
                      fill={isVacant ? '#B8883D' : '#F4EFE7'}
                    >
                      {label}
                    </text>

                    {/* BED N small label */}
                    <text
                      x="360"
                      y={yPos + (bedSpacing - 20) / 2 + 18}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      fill={isVacant ? '#9C948B' : '#9FE1CB'}
                      letterSpacing="1"
                    >
                      BED {bed.bed_number}
                    </text>
                  </g>
                )
              })
            ) : (
              // FALLBACK: Static rendering for Bartawi/pre-4B.5 rooms
              staticRightBeds.map((bed, idx) => {
                const yPos = 60 + idx * bedSpacing
                return (
                  <g key={bed.id}>
                    {bed.occupied ? (
                      <>
                        <rect
                          x="300"
                          y={yPos}
                          width="120"
                          height={bedSpacing - 20}
                          fill="#1E4D52"
                          stroke="#0D2A2D"
                          strokeWidth="0.8"
                          rx="2"
                        />
                        <rect
                          x="384"
                          y={yPos + 6}
                          width="30"
                          height="18"
                          fill="#F4EFE7"
                          rx="1.5"
                        />
                        <text
                          x="360"
                          y={yPos + (bedSpacing - 20) / 2 + 4}
                          textAnchor="middle"
                          fontFamily="Geist, Inter, sans-serif"
                          fontSize="13"
                          fontWeight="500"
                          fill="#F4EFE7"
                        >
                          Person {idx + bedsPerWall + 1}
                        </text>
                        <text
                          x="360"
                          y={yPos + (bedSpacing - 20) / 2 + 18}
                          textAnchor="middle"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="9"
                          fill="#9FE1CB"
                          letterSpacing="1"
                        >
                          BED {bed.id.substring(1)}
                        </text>
                      </>
                    ) : (
                      <>
                        <rect
                          x="300"
                          y={yPos}
                          width="120"
                          height={bedSpacing - 20}
                          fill="none"
                          stroke="#B8883D"
                          strokeWidth="1"
                          strokeDasharray="4 3"
                          rx="2"
                        />
                        <rect
                          x="384"
                          y={yPos + 6}
                          width="30"
                          height="18"
                          fill="none"
                          stroke="#B8883D"
                          strokeWidth="0.6"
                          strokeDasharray="2 2"
                          rx="1.5"
                        />
                        <text
                          x="360"
                          y={yPos + (bedSpacing - 20) / 2 + 6}
                          textAnchor="middle"
                          fontFamily="Geist, Inter, sans-serif"
                          fontSize="12"
                          fontStyle="italic"
                          fill="#B8883D"
                        >
                          vacant
                        </text>
                      </>
                    )}
                  </g>
                )
              })
            )}

            {/* Center: table */}
            <rect
              x="200"
              y="170"
              width="80"
              height="50"
              fill="#E8DFD3"
              stroke="#1A1816"
              strokeWidth="1"
              rx="2"
            />
            <text
              x="240"
              y="200"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              table
            </text>

            {/* Scale reference */}
            <g transform="translate(400, 390)">
              <line x1="0" y1="0" x2="40" y2="0" stroke="#6A6159" strokeWidth="0.8" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#6A6159" strokeWidth="0.8" />
              <line x1="40" y1="-3" x2="40" y2="3" stroke="#6A6159" strokeWidth="0.8" />
              <text
                x="20"
                y="14"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                fill="#9C948B"
                letterSpacing="0.05em"
              >
                3.45 m
              </text>
            </g>
          </svg>
        </motion.div>

        {/* DATA SIDEBAR */}
        <div className="flex flex-col gap-2.5">
          {/* Tenant card */}
          {status === 'occupied' && (
            <motion.div
              className="p-4 bg-paper rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-1.5 font-medium">
                Tenant
              </p>
              <p className="font-serif italic text-[18px] text-espresso leading-tight">
                {displayTenantName}
              </p>
              {contract.type && (
                <p className="text-[12px] text-stone mt-1" style={{ textTransform: 'capitalize' }}>
                  {contract.type === 'yearly' ? 'Yearly lease' : 'Monthly rental'} · {peopleCount} resident{peopleCount !== 1 ? 's' : ''}
                </p>
              )}
              {mobile !== '—' && (
                <p className="text-[11px] font-mono text-stone mt-1">{mobile}</p>
              )}
            </motion.div>
          )}

          {/* Financials card */}
          {status === 'occupied' && rent > 0 && (
            <motion.div
              style={{
                padding: '16px',
                background: contract.status === 'expired'
                  ? 'rgba(168, 74, 59, 0.06)'
                  : contract.status === 'expiring_soon'
                  ? 'rgba(184, 136, 61, 0.08)'
                  : balance > 0
                  ? 'rgba(168, 74, 59, 0.06)'
                  : 'rgba(30, 77, 82, 0.06)',
                borderRadius: '12px',
                border: `0.5px solid ${
                  contract.status === 'expired'
                    ? 'rgba(168, 74, 59, 0.3)'
                    : contract.status === 'expiring_soon'
                    ? 'rgba(184, 136, 61, 0.3)'
                    : balance > 0
                    ? 'rgba(168, 74, 59, 0.3)'
                    : 'rgba(30, 77, 82, 0.2)'
                }`,
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* Header row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '10px',
              }}>
                <p style={{
                  fontSize: '10px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: contract.status === 'expired' ? '#A84A3B'
                       : contract.status === 'expiring_soon' ? '#8B6420'
                       : balance > 0 ? '#A84A3B'
                       : '#1E4D52',
                  fontWeight: 600,
                  margin: 0,
                }}>
                  {contract.type === 'yearly' ? 'Yearly contract' : monthLabel || 'This month'}
                </p>
                <p style={{
                  fontSize: '10px',
                  color: balance > 0 ? '#A84A3B' : isPaid ? '#1E4D52' : '#6A6159',
                  fontWeight: 500,
                  margin: 0,
                }}>
                  {isPaid ? '✓ settled' : balance > 0 ? 'due' : ''}
                </p>
              </div>

              {/* Contract dates (yearly only) */}
              {contract.type === 'yearly' && contract.endDate && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', padding: '3px 0' }}>
                    <span style={{ color: '#6A6159' }}>Start</span>
                    <span style={{ color: '#1A1816' }}>{formatDateShort(contract.startDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', padding: '3px 0' }}>
                    <span style={{ color: '#6A6159' }}>End</span>
                    <span style={{
                      color: contract.status === 'expired' ? '#A84A3B'
                           : contract.status === 'expiring_soon' ? '#8B6420'
                           : '#1A1816',
                      fontWeight: contract.status !== 'active' ? 500 : 400,
                    }}>
                      {formatDateShort(contract.endDate)}
                      {contract.status === 'expired' && ` · ${Math.abs(contract.daysUntilExpiry || 0)}d ago`}
                      {contract.status === 'expiring_soon' && ` · ${contract.daysUntilExpiry}d left`}
                    </span>
                  </div>
                  <div style={{ height: '0.5px', background: 'rgba(106, 97, 89, 0.2)', margin: '8px 0' }} />
                </>
              )}

              {/* Payment Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: `${statusColor}14`,
                border: `0.5px solid ${statusColor}`,
                borderRadius: '999px',
                marginBottom: '12px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: statusColor,
                }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: statusColor,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {statusLabel}
                  {paymentStatus === 'partial' && room?.current_month && (
                    <span style={{ marginLeft: 8, opacity: 0.8, fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(room.current_month.paid).toLocaleString()} / {Number(room.current_month.rent).toLocaleString()}
                    </span>
                  )}
                </span>
              </div>

              {/* Financials */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '3px 0',
              }}>
                <span style={{ color: '#6A6159' }}>
                  Rent
                </span>
                <span style={{ color: '#1A1816' }}>
                  AED {rent.toLocaleString()}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '3px 0',
              }}>
                <span style={{ color: '#6A6159' }}>Paid</span>
                <span style={{ color: '#1E4D52' }}>AED {paid.toLocaleString()}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                paddingTop: '8px',
                marginTop: '4px',
                borderTop: '0.5px solid rgba(106, 97, 89, 0.2)',
              }}>
                <span style={{ color: '#1A1816', fontWeight: 600 }}>Balance</span>
                <span style={{
                  color: balance > 0 ? '#A84A3B' : '#1E4D52',
                  fontWeight: 600,
                }}>
                  AED {balance.toLocaleString()}
                </span>
              </div>

              {/* Remarks (legal, special notes, etc) */}
              {remarks && (
                <p style={{
                  fontSize: '11px',
                  color: '#6A6159',
                  fontStyle: 'italic',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '0.5px solid rgba(106, 97, 89, 0.15)',
                  lineHeight: 1.5,
                }}>
                  {remarks}
                </p>
              )}
            </motion.div>
          )}

          {/* History card */}
          {historyData?.data && historyData.data.length > 0 && (
            <motion.div
              className="p-4 bg-paper rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-2 font-medium">
                Last 3 months
              </p>
              <div className="font-mono text-[11px]">
                {historyData.data.slice(0, 3).map((entry: any, idx: number) => {
                  const month = entry.month ? String(entry.month) : ''
                  const paid = entry.paid || 0
                  const balance = entry.balance || 0
                  const fullyPaid = balance === 0

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex justify-between py-1',
                        idx < 2 ? 'border-b border-dust' : ''
                      )}
                    >
                      <span className="text-stone">{month.substring(0, 3)}</span>
                      <span className={fullyPaid ? 'text-teal' : 'text-amber'}>
                        {fullyPaid
                          ? `${paid.toLocaleString()} ✓`
                          : `${paid.toLocaleString()} / ${balance.toLocaleString()}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Payment History */}
          {paymentsData?.payments && paymentsData.payments.length > 0 && (
            <motion.div
              className="p-4 bg-paper rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-2.5 font-medium">
                Payment History
              </p>
              <div className="space-y-2">
                {paymentsData.payments.slice(0, 6).map((payment: any) => {
                  const isReversed = payment.reversed
                  const amount = Number(payment.amount)
                  const method = payment.method as PaymentMethod
                  const date = payment.payment_date

                  return (
                    <div
                      key={payment.id}
                      className="flex justify-between items-start text-[11px] pb-2 border-b border-dust/50 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-mono text-espresso">
                          AED {amount.toLocaleString()}
                          {isReversed && (
                            <span className="ml-2 text-[9px] text-rust font-medium">REVERSED</span>
                          )}
                        </p>
                        <p className="text-[10px] text-stone mt-0.5">
                          {formatMethod(method)}
                          {payment.cheque_number && ` • #${payment.cheque_number}`}
                          {payment.transfer_reference && ` • ${payment.transfer_reference}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-stone">{formatDateLong(date)}</p>
                        {payment.payment_type && (
                          <p className="text-[9px] text-stone/70 mt-0.5 capitalize">
                            {payment.payment_type}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {status === 'occupied' && (
            <motion.div
              style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                disabled={!canLogRent && !canLogDeposit}
                onClick={() => handleOpenPaymentDialog(canLogRent ? 'rent' : 'deposit')}
                onMouseEnter={() => setHoverLogPayment(true)}
                onMouseLeave={() => setHoverLogPayment(false)}
                title={!canLogRent && !canLogDeposit ? 'No outstanding balance' : 'Log payment'}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: !canLogRent && !canLogDeposit
                    ? '#E5DFD5'
                    : hoverLogPayment ? '#A0732E' : '#B8883D',
                  color: !canLogRent && !canLogDeposit ? '#9C948B' : '#FAF7F2',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  cursor: !canLogRent && !canLogDeposit ? 'not-allowed' : 'pointer',
                  opacity: !canLogRent && !canLogDeposit ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: hoverLogPayment && (canLogRent || canLogDeposit) ? '0 2px 8px rgba(184, 136, 61, 0.35)' : 'none',
                }}
              >
                Log payment
              </button>
              <button
                disabled={!hasActiveLease || !(room.active_lease?.status === 'active' || room.active_lease?.status === 'notice_given')}
                onClick={() => setCheckoutOpen(true)}
                onMouseEnter={() => setHoverGiveNotice(true)}
                onMouseLeave={() => setHoverGiveNotice(false)}
                title={!hasActiveLease ? 'No active lease' : 'Give notice or checkout'}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: hasActiveLease && (room.active_lease?.status === 'active' || room.active_lease?.status === 'notice_given')
                    ? (room.active_lease?.status === 'notice_given' ? '#B8883D' : (hoverGiveNotice ? 'rgba(26, 24, 22, 0.04)' : 'transparent'))
                    : 'transparent',
                  color: room.active_lease?.status === 'notice_given' ? '#FAF7F2' : '#1A1816',
                  border: room.active_lease?.status === 'notice_given' ? 'none' : (hoverGiveNotice ? '0.5px solid #6A6159' : '0.5px solid #D6CFC5'),
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  cursor: hasActiveLease && (room.active_lease?.status === 'active' || room.active_lease?.status === 'notice_given') ? 'pointer' : 'not-allowed',
                  opacity: hasActiveLease && (room.active_lease?.status === 'active' || room.active_lease?.status === 'notice_given') ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                }}
              >
                {room.active_lease?.status === 'notice_given' ? 'Complete Checkout' : 'Give notice'}
              </button>
            </motion.div>
          )}

          {/* Action button for vacant rooms */}
          {canLease && (
            <motion.div
              style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => setWizardOpen(true)}
                onMouseEnter={() => setHoverNewLease(true)}
                onMouseLeave={() => setHoverNewLease(false)}
                style={{
                  flex: 1,
                  padding: '10px 18px',
                  background: hoverNewLease ? '#164045' : '#1E4D52',
                  color: '#F4EFE7',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: hoverNewLease ? '0 2px 8px rgba(30, 77, 82, 0.35)' : 'none',
                }}
              >
                Lease this room
              </button>
            </motion.div>
          )}

          {/* For Bartawi rooms */}
          {isBartawi && (
            <motion.div
              className="p-4 bg-amber/8 rounded-xl border border-amber/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-amber mb-1.5 font-semibold">
                Bartawi Use
              </p>
              <p className="font-serif italic text-[16px] text-espresso">
                {tenantName}
              </p>
              <p className="text-[12px] text-stone mt-1">
                Reserved for operations · not tenanted
              </p>
            </motion.div>
          )}

          {/* For vacant rooms */}
          {status === 'vacant' && (
            <motion.div
              className="p-4 bg-dust/30 rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-1.5 font-medium">
                Available
              </p>
              <p className="font-serif italic text-[16px] text-espresso">
                Room vacant
              </p>
              <p className="text-[12px] text-stone mt-1">
                Ready for new lease
              </p>
              <button
                disabled
                onMouseEnter={() => setHoverNewLease(true)}
                onMouseLeave={() => setHoverNewLease(false)}
                title="Available in Phase 4"
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '11px 14px',
                  background: hoverNewLease ? '#153C40' : '#1E4D52',
                  color: '#FAF7F2',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  cursor: 'not-allowed',
                  opacity: 0.85,
                  transition: 'all 0.2s ease',
                  boxShadow: hoverNewLease ? '0 2px 8px rgba(30, 77, 82, 0.35)' : 'none',
                }}
              >
                New lease
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <LogPaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        room={room}
        paymentType={paymentType}
      />

      {/* Lease Wizard */}
      <CreateLeaseWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setPrefilledBedspaceId(null)  // Clear prefill on close
        }}
        campId={room?.camp_id}
        prefilledRoomId={room?.id}
        prefilledBedspaceId={prefilledBedspaceId}
      />

      {/* Bed Detail Panel — Phase 4B.5 */}
      <BedInterior
        bedspaceId={openedBedspaceId}
        onClose={() => setOpenedBedspaceId(null)}
      />

      {/* Checkout Wizard — Phase 4C */}
      {room?.active_lease && (
        <CheckoutWizard
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          lease={{
            ...room.active_lease,
            room_number: room.room_number,
            camp_id: room.camp_id,
            tenant_name: displayTenantName,
          }}
        />
      )}
    </motion.div>
  )
}
