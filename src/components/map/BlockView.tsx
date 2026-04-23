'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { getBlockByCode } from '@/data/camp-layout'
import type { BlockLayout } from '@/data/camp-layout'
import {
  getRoomStatus,
  getTenantName,
  getCompanyName,
  getPeopleCount,
  getMonthlyRent,
  getBalance,
  getPaid,
  getPaymentStatus,
  STATUS_COLORS,
} from '@/lib/room-helpers'
import { getContractInfo } from '@/lib/contract-helpers'
import { CaretLeft } from '@phosphor-icons/react'

// Handle format differences: "B01" vs "B-1", "BB01" vs "BB-1", etc.
function normalizeRoomCode(code: string): string {
  if (!code) return ''
  const match = code.match(/^([A-Z]+)-?0*(\d+)$/)
  if (match) return `${match[1]}-${match[2]}`
  return code
}

// Phase 4B.7: Tooltip helper for room cards
function getRoomTooltip(room: any): string {
  if (!room) return ''

  const activeLease = room.active_lease
  const bedState = room.bedspaces_state || []
  const totalBeds = bedState.length
  const occupiedBedLevel = bedState.filter((b: any) =>
    b.payment_status && b.payment_status !== 'vacant'
  ).length

  if (activeLease && room.has_room_level_lease) {
    const tenantName = activeLease.tenant?.is_company
      ? activeLease.tenant.company_name
      : activeLease.tenant?.full_name
    const endDate = activeLease.end_date
      ? new Date(activeLease.end_date).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        })
      : 'Open-ended'
    return `Room ${room.room_number} · Whole-room\n${tenantName || ''}\nEnds: ${endDate}`
  }

  if (occupiedBedLevel > 0) {
    return `Room ${room.room_number} · Bed-level\n${occupiedBedLevel} of ${totalBeds} beds occupied`
  }

  return `Room ${room.room_number} · Vacant\n${totalBeds} beds available`
}

interface BlockViewProps {
  campCode: string
  blockCode: string
  rooms: any[]
  onBack: () => void
  onRoomClick: (roomCode: string) => void
}

export function BlockView({ campCode, blockCode, rooms, onBack, onRoomClick }: BlockViewProps) {
  const block = getBlockByCode(campCode, blockCode)
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)

  if (!block) return null

  // Filter rooms to just this block
  const blockRooms = rooms.filter(r => r.block?.code === blockCode)

  // Map of normalized room code → API room object
  // This handles format differences between layout ("B-1") and API ("B01")
  const apiRoomsByNormalizedCode = useMemo(() => {
    const map = new Map<string, any>()
    blockRooms.forEach((r: any) => {
      if (r.room_number) {
        map.set(normalizeRoomCode(r.room_number), r)
      }
    })
    return map
  }, [blockRooms])

  // Calculate block stats
  const occupied = blockRooms.filter(r => getRoomStatus(r) === 'occupied').length
  const total = blockRooms.length
  const totalRent = blockRooms.reduce((sum, r) => sum + getMonthlyRent(r), 0)
  const totalPaid = blockRooms.reduce((sum, r) => sum + getPaid(r), 0)

  const blockStats = useMemo(() => {
    let totalCollected = 0
    let totalOutstanding = 0

    blockRooms.forEach((r: any) => {
      totalCollected += getPaid(r)
      const balance = getBalance(r)
      if (balance > 0) {
        totalOutstanding += balance
      }
    })

    return { totalCollected, totalOutstanding }
  }, [blockRooms])

  // Dynamic month label from first available room's current_month
  const displayMonthLabel = useMemo(() => {
    const firstRoomWithCurrent = blockRooms.find((r: any) => r.current_month)
    const cm = firstRoomWithCurrent?.current_month
    if (cm) return `${cm.month_name} ${cm.year}`
    return ''
  }, [blockRooms])

  // Split rooms by column position (left column includes all rooms with x=0, right column x>0)
  // Extras (B-23, B-24, etc.) are included in their natural columns based on x position
  const leftColumnRooms = block.rooms.filter(r => r.x === 0)
  const rightColumnRooms = block.rooms.filter(r => r.x > 0)

  // Dynamic positioning based on actual room count to prevent overlap in tall blocks
  const ROW_HEIGHT = 38  // 32px rect + 6px gap
  const leftColumnHeight = leftColumnRooms.length * ROW_HEIGHT
  const rightColumnHeight = rightColumnRooms.length * ROW_HEIGHT
  const maxColumnHeight = Math.max(leftColumnHeight, rightColumnHeight)
  const maxColumnRooms = Math.max(leftColumnRooms.length, rightColumnRooms.length)
  const lastRoomBottomY = 50 + maxColumnHeight - 6  // start at y=50, subtract last gap
  const entranceY = lastRoomBottomY + 28  // 28px gap below last room
  const blockBottomY = entranceY + 20    // block outline extends below entrance
  const viewBoxHeight = Math.max(555, 80 + maxColumnRooms * 38)

  // Scale toilet/bath pairs with block height
  const toiletBathPairs = Math.max(2, Math.min(6, Math.ceil(maxColumnRooms / 2.5)))
  const toiletYPositions = Array.from({ length: toiletBathPairs }, (_, i) => {
    const totalHeight = maxColumnRooms * 38
    return 60 + (i * totalHeight / toiletBathPairs)
  })

  return (
    <motion.div
      layoutId={`block-${blockCode}`}
      className="relative w-full"
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
    >
      {/* Mobile message */}
      <div className="sm:hidden px-6 py-12 text-center">
        <p className="font-serif text-[20px] italic text-espresso mb-2">Block {blockCode}</p>
        <p className="text-[13px] text-stone mb-4">
          Block interior view requires a larger screen.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber text-sand rounded-full text-[12px] font-medium"
        >
          Back to map
        </button>
      </div>

      {/* Desktop view - hidden on mobile */}
      <div className="hidden sm:block">
      {/* Header */}
      <motion.div
        className="flex justify-between items-start px-6 pt-6 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-amber hover:text-amber/80 mb-2 transition-colors"
          >
            <CaretLeft size={12} weight="light" />
            Back to map
          </button>
          <p className="font-serif text-[26px] italic text-espresso leading-tight">
            Inside Block {blockCode}
          </p>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            {total} rooms · {occupied} occupied · {total - occupied} vacant/special
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: '22px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#1A1816',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            AED {blockStats.totalCollected.toLocaleString()}
          </p>
          <p style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#6A6159',
            marginTop: '4px',
            fontWeight: 500,
          }}>
            Collected{displayMonthLabel ? ` · ${displayMonthLabel}` : ''}
          </p>
          {blockStats.totalOutstanding > 0 && (
            <p style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#A84A3B',
              marginTop: '6px',
              fontWeight: 500,
            }}>
              AED {blockStats.totalOutstanding.toLocaleString()} outstanding
            </p>
          )}
        </div>
      </motion.div>

      {/* Block interior SVG */}
      <motion.div
        className="px-6 pb-6"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 280, damping: 30 }}
      >
        <svg
          viewBox={`0 0 800 ${viewBoxHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          {/* Block outline */}
          <rect
            x="20"
            y="10"
            width="760"
            height={viewBoxHeight - 20}
            fill="rgba(30, 77, 82, 0.03)"
            stroke="#1E4D52"
            strokeWidth="1.5"
            rx="8"
          />

          {/* CENTRAL CORRIDOR with toilets/baths */}
          <rect
            x="310"
            y="10"
            width="180"
            height={viewBoxHeight - 20}
            fill="#E8E0D6"
          />

          <text
            x="400"
            y="32"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            letterSpacing="3"
            fontWeight="500"
            fill="#6A6159"
          >
            CORRIDOR
          </text>

          {/* Toilet/bath pairs down the corridor - scaled with block height */}
          {toiletYPositions.map((yPos, i) => (
            <g key={`facilities-${i}`}>
              <rect
                x="330"
                y={yPos}
                width="70"
                height="26"
                fill="#D8E3E4"
                stroke="#1E4D52"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x="365"
                y={yPos + 16}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="8"
                fill="#1E4D52"
                letterSpacing="1"
              >
                TOILET
              </text>

              <rect
                x="405"
                y={yPos}
                width="70"
                height="26"
                fill="#D8E3E4"
                stroke="#1E4D52"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x="440"
                y={yPos + 16}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="8"
                fill="#1E4D52"
                letterSpacing="1"
              >
                BATH
              </text>
            </g>
          ))}

          {/* LEFT COLUMN ROOMS (1-11, reading top to bottom) */}
          {leftColumnRooms.map((room, idx) => {
            const apiRoom = apiRoomsByNormalizedCode.get(normalizeRoomCode(room.code))
            const status = apiRoom ? getRoomStatus(apiRoom) : 'vacant'
            const tenantName = apiRoom ? getTenantName(apiRoom) : ''
            const companyName = apiRoom ? getCompanyName(apiRoom) : ''
            const peopleCount = apiRoom ? getPeopleCount(apiRoom) : 0
            const rent = apiRoom ? getMonthlyRent(apiRoom) : 0
            const balance = apiRoom ? getBalance(apiRoom) : 0
            const contract = apiRoom ? getContractInfo(apiRoom) : { type: null, status: 'none', daysUntilExpiry: null, hasLegalIssue: false }

            const displayName = tenantName || companyName || room.label || '—'

            // Position each room as a horizontal strip
            const yPos = 50 + idx * 38

            const isHovered = hoveredRoom === room.code

            // Payment status determines base color
            const paymentStatus = apiRoom ? getPaymentStatus(apiRoom) : 'vacant'
            const baseColor = STATUS_COLORS[paymentStatus]

            // Convert hex to rgba for fills
            const hexToRgba = (hex: string, alpha: number) => {
              const r = parseInt(hex.slice(1, 3), 16)
              const g = parseInt(hex.slice(3, 5), 16)
              const b = parseInt(hex.slice(5, 7), 16)
              return `rgba(${r}, ${g}, ${b}, ${alpha})`
            }

            let fillColor = hexToRgba(baseColor, 0.08)
            let strokeColor = baseColor
            let strokeWidth = '1'
            let roomNumberColor = paymentStatus === 'bartawi' ? '#8B6420' : '#1A1816'
            let textColor = paymentStatus === 'bartawi' ? '#8B6420' : '#6A6159'

            // Vacant rooms: lighter fill
            if (paymentStatus === 'vacant') {
              fillColor = 'none'
              strokeColor = '#D6CFC5'
              strokeWidth = '1'
            }

            // Contract states override (visual priority for expiry)
            if (contract.status === 'expired') {
              strokeColor = '#8B6420'
              strokeWidth = '1.5'
            }
            if (contract.status === 'expiring_soon') {
              strokeColor = '#B8883D'
              strokeWidth = '1.5'
            }

            // Payment status: unpaid and partial get thicker stroke
            if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
              strokeWidth = '1.5'
            }

            // Hover state overrides
            if (isHovered) {
              fillColor = 'rgba(184, 136, 61, 0.15)'
              strokeColor = '#B8883D'
              strokeWidth = '1.5'
            }

            return (
              <motion.g
                key={room.code}
                layoutId={`room-${room.code}`}
                onMouseEnter={() => setHoveredRoom(room.code)}
                onMouseLeave={() => setHoveredRoom(null)}
                className="cursor-pointer"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                transition={{
                  delay: 0.2 + idx * 0.03,
                  type: 'spring',
                  stiffness: 400,
                  damping: 30
                }}
                style={{ transformOrigin: `155px ${yPos + 16}px` }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                <rect
                  x="30"
                  y={yPos}
                  width="270"
                  height="32"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={status === 'vacant' && paymentStatus !== 'bartawi' ? '4 3' : undefined}
                  rx="3"
                  className="transition-all duration-150"
                >
                  <title>{getRoomTooltip(apiRoom)}</title>
                </rect>

                {/* Room number */}
                <text
                  x="42"
                  y={yPos + 14}
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11"
                  fontWeight="600"
                  fill={roomNumberColor}
                  letterSpacing="0.05em"
                >
                  {room.code}
                </text>

                {/* Tenant name / status */}
                <text
                  x="42"
                  y={yPos + 26}
                  fontFamily="Geist, Inter, sans-serif"
                  fontSize="9"
                  fill={textColor}
                  fontStyle={status === 'vacant' && paymentStatus !== 'bartawi' ? 'italic' : 'normal'}
                >
                  {status === 'vacant' && paymentStatus !== 'bartawi'
                    ? 'vacant'
                    : paymentStatus === 'bartawi'
                    ? `${displayName} · Bartawi use`
                    : `${displayName.substring(0, 28)} · ${peopleCount}/8`}
                </text>

                {/* Rent / status on right */}
                <text
                  x="288"
                  y={yPos + 20}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="9"
                  fill={
                    balance > 0 ? '#A84A3B' :
                    contract.status === 'expired' ? '#8B6420' :
                    contract.status === 'expiring_soon' ? '#B8883D' :
                    status === 'occupied' ? '#1E4D52' :
                    '#9C948B'
                  }
                >
                  {(() => {
                    if (paymentStatus === 'bartawi' && rent === 0) return '—'
                    if (balance > 0) return `AED ${balance.toLocaleString()} due`

                    // Yearly contracts — show expiry status
                    if (contract.type === 'yearly') {
                      if (contract.status === 'expired') {
                        return `Expired ${Math.abs(contract.daysUntilExpiry || 0)}d ago`
                      }
                      if (contract.status === 'expiring_soon') {
                        return `${contract.daysUntilExpiry}d left`
                      }
                      if (rent > 0) return `AED ${rent.toLocaleString()} ✓ yearly`
                    }

                    if (rent > 0) return `AED ${rent.toLocaleString()} ✓`
                    return '—'
                  })()}
                </text>

                {/* Invisible click target for reliable clicks */}
                <rect
                  x="30"
                  y={yPos}
                  width="270"
                  height="32"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onRoomClick(room.code)}
                />
              </motion.g>
            )
          })}

          {/* RIGHT COLUMN ROOMS (22-12, reading top to bottom) */}
          {rightColumnRooms.map((room, idx) => {
            const apiRoom = apiRoomsByNormalizedCode.get(normalizeRoomCode(room.code))
            const status = apiRoom ? getRoomStatus(apiRoom) : 'vacant'
            const tenantName = apiRoom ? getTenantName(apiRoom) : ''
            const companyName = apiRoom ? getCompanyName(apiRoom) : ''
            const peopleCount = apiRoom ? getPeopleCount(apiRoom) : 0
            const rent = apiRoom ? getMonthlyRent(apiRoom) : 0
            const balance = apiRoom ? getBalance(apiRoom) : 0
            const contract = apiRoom ? getContractInfo(apiRoom) : { type: null, status: 'none', daysUntilExpiry: null, hasLegalIssue: false }

            const displayName = tenantName || companyName || room.label || '—'

            const yPos = 50 + idx * 38

            const isHovered = hoveredRoom === room.code

            // Payment status determines base color
            const paymentStatus = apiRoom ? getPaymentStatus(apiRoom) : 'vacant'
            const baseColor = STATUS_COLORS[paymentStatus]

            // Convert hex to rgba for fills
            const hexToRgba = (hex: string, alpha: number) => {
              const r = parseInt(hex.slice(1, 3), 16)
              const g = parseInt(hex.slice(3, 5), 16)
              const b = parseInt(hex.slice(5, 7), 16)
              return `rgba(${r}, ${g}, ${b}, ${alpha})`
            }

            let fillColor = hexToRgba(baseColor, 0.08)
            let strokeColor = baseColor
            let strokeWidth = '1'
            let roomNumberColor = paymentStatus === 'bartawi' ? '#8B6420' : '#1A1816'
            let textColor = paymentStatus === 'bartawi' ? '#8B6420' : '#6A6159'

            // Vacant rooms: lighter fill
            if (paymentStatus === 'vacant') {
              fillColor = 'none'
              strokeColor = '#D6CFC5'
              strokeWidth = '1'
            }

            // Contract states override (visual priority for expiry)
            if (contract.status === 'expired') {
              strokeColor = '#8B6420'
              strokeWidth = '1.5'
            }
            if (contract.status === 'expiring_soon') {
              strokeColor = '#B8883D'
              strokeWidth = '1.5'
            }

            // Payment status: unpaid and partial get thicker stroke
            if (paymentStatus === 'unpaid' || paymentStatus === 'partial') {
              strokeWidth = '1.5'
            }

            // Hover state overrides
            if (isHovered) {
              fillColor = 'rgba(184, 136, 61, 0.15)'
              strokeColor = '#B8883D'
              strokeWidth = '1.5'
            }

            return (
              <motion.g
                key={room.code}
                layoutId={`room-${room.code}`}
                onMouseEnter={() => setHoveredRoom(room.code)}
                onMouseLeave={() => setHoveredRoom(null)}
                className="cursor-pointer"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                transition={{
                  delay: 0.2 + idx * 0.03,
                  type: 'spring',
                  stiffness: 400,
                  damping: 30
                }}
                style={{ transformOrigin: `635px ${yPos + 16}px` }}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                <rect
                  x="500"
                  y={yPos}
                  width="270"
                  height="32"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={status === 'vacant' && paymentStatus !== 'bartawi' ? '4 3' : undefined}
                  rx="3"
                  className="transition-all duration-150"
                >
                  <title>{getRoomTooltip(apiRoom)}</title>
                </rect>

                <text
                  x="512"
                  y={yPos + 14}
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11"
                  fontWeight="600"
                  fill={roomNumberColor}
                  letterSpacing="0.05em"
                >
                  {room.code}
                </text>

                <text
                  x="512"
                  y={yPos + 26}
                  fontFamily="Geist, Inter, sans-serif"
                  fontSize="9"
                  fill={textColor}
                  fontStyle={status === 'vacant' && paymentStatus !== 'bartawi' ? 'italic' : 'normal'}
                >
                  {status === 'vacant' && paymentStatus !== 'bartawi'
                    ? 'vacant'
                    : paymentStatus === 'bartawi'
                    ? `${displayName} · Bartawi use`
                    : `${displayName.substring(0, 28)} · ${peopleCount}/8`}
                </text>

                <text
                  x="758"
                  y={yPos + 20}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="9"
                  fill={
                    balance > 0 ? '#A84A3B' :
                    contract.status === 'expired' ? '#8B6420' :
                    contract.status === 'expiring_soon' ? '#B8883D' :
                    status === 'occupied' ? '#1E4D52' :
                    '#9C948B'
                  }
                >
                  {(() => {
                    if (paymentStatus === 'bartawi' && rent === 0) return '—'
                    if (balance > 0) return `AED ${balance.toLocaleString()} due`

                    // Yearly contracts — show expiry status
                    if (contract.type === 'yearly') {
                      if (contract.status === 'expired') {
                        return `Expired ${Math.abs(contract.daysUntilExpiry || 0)}d ago`
                      }
                      if (contract.status === 'expiring_soon') {
                        return `${contract.daysUntilExpiry}d left`
                      }
                      if (rent > 0) return `AED ${rent.toLocaleString()} ✓ yearly`
                    }

                    if (rent > 0) return `AED ${rent.toLocaleString()} ✓`
                    return '—'
                  })()}
                </text>

                {/* Invisible click target for reliable clicks */}
                <rect
                  x="500"
                  y={yPos}
                  width="270"
                  height="32"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onRoomClick(room.code)}
                />
              </motion.g>
            )
          })}

          {/* Entrance indicators */}
          <text
            x="155"
            y={entranceY}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            letterSpacing="1"
            fill="#9C948B"
          >
            ▲ ENTRANCE
          </text>
          <text
            x="635"
            y={entranceY}
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="8"
            letterSpacing="1"
            fill="#9C948B"
          >
            ENTRANCE ▲
          </text>
        </svg>

        <p className="text-center text-[11px] text-stone mt-3">
          Click any room to view details
        </p>
      </motion.div>
      </div>
    </motion.div>
  )
}
