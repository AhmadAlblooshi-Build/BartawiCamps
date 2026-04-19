'use client'

import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { getBlockByCode } from '@/data/camp1-layout'
import {
  getRoomStatus,
  getTenantName,
  getCompanyName,
  getPeopleCount,
  getMonthlyRent,
  getBalance,
  getPaid,
} from '@/lib/room-helpers'
import { CaretLeft } from '@phosphor-icons/react'

// Handle format differences: "B01" vs "B-1", "BB01" vs "BB-1", etc.
function normalizeRoomCode(code: string): string {
  if (!code) return ''
  const match = code.match(/^([A-Z]+)-?0*(\d+)$/)
  if (match) return `${match[1]}-${match[2]}`
  return code
}

interface BlockViewProps {
  blockCode: string
  rooms: any[]
  onBack: () => void
  onRoomClick: (roomCode: string) => void
}

export function BlockView({ blockCode, rooms, onBack, onRoomClick }: BlockViewProps) {
  const block = getBlockByCode(blockCode)
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
  const totalOutstanding = blockRooms.reduce((sum, r) => sum + getBalance(r), 0)

  // Split rooms by column position (left column includes all rooms with x=0, right column x>0)
  // Extras (B-23, B-24, etc.) are included in their natural columns based on x position
  const leftColumnRooms = block.rooms.filter(r => r.x === 0)
  const rightColumnRooms = block.rooms.filter(r => r.x > 0)

  // Dynamic positioning based on actual room count to prevent overlap in tall blocks
  const ROW_HEIGHT = 38  // 32px rect + 6px gap
  const leftColumnHeight = leftColumnRooms.length * ROW_HEIGHT
  const rightColumnHeight = rightColumnRooms.length * ROW_HEIGHT
  const maxColumnHeight = Math.max(leftColumnHeight, rightColumnHeight)
  const lastRoomBottomY = 50 + maxColumnHeight - 6  // start at y=50, subtract last gap
  const entranceY = lastRoomBottomY + 28  // 28px gap below last room
  const blockBottomY = entranceY + 20    // block outline extends below entrance

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

        <div className="text-right">
          <p className="font-mono text-[24px] font-semibold text-espresso leading-none">
            AED {totalPaid.toLocaleString()}
          </p>
          <p className="text-[10px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            Collected · March 2026
          </p>
          {totalOutstanding > 0 && (
            <p className="text-[11px] font-mono text-rust mt-1">
              AED {totalOutstanding.toLocaleString()} outstanding
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
          viewBox={`0 0 800 ${blockBottomY + 20}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          {/* Block outline */}
          <rect
            x="20"
            y="10"
            width="760"
            height={blockBottomY - 10}
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
            height={blockBottomY - 10}
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

          {/* Toilet/bath pairs down the corridor */}
          {[60, 150, 240, 330, 420].map((yPos, i) => (
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
            const hasBalance = balance > 0

            const displayName = tenantName || companyName || room.label || '—'

            // Position each room as a horizontal strip
            const yPos = 50 + idx * 38

            const isBartawi = room.type === 'bartawi' || room.type === 'office' || room.type === 'security' || room.type === 'cleaners' || room.type === 'restaurant'
            const isHovered = hoveredRoom === room.code

            let fillColor = 'rgba(30, 77, 82, 0.05)'
            let strokeColor = 'rgba(30, 77, 82, 0.3)'
            let strokeWidth = '1'
            let roomNumberColor = '#1A1816'
            let textColor = '#6A6159'

            if (status === 'occupied') {
              fillColor = 'rgba(30, 77, 82, 0.08)'
              strokeColor = 'rgba(30, 77, 82, 0.4)'
            }
            if (isBartawi) {
              fillColor = 'rgba(184, 136, 61, 0.1)'
              strokeColor = 'rgba(184, 136, 61, 0.5)'
              roomNumberColor = '#8B6420'
              textColor = '#8B6420'
            }
            if (status === 'vacant' && !isBartawi) {
              fillColor = 'none'
              strokeColor = '#B8883D'
              strokeWidth = '1'
            }
            if (hasBalance) {
              strokeColor = '#A84A3B'
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
                  strokeDasharray={status === 'vacant' && !isBartawi ? '4 3' : undefined}
                  rx="3"
                  className="transition-all duration-150"
                />

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
                  fontStyle={status === 'vacant' && !isBartawi ? 'italic' : 'normal'}
                >
                  {status === 'vacant' && !isBartawi
                    ? 'vacant'
                    : isBartawi
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
                  fill={hasBalance ? '#A84A3B' : status === 'occupied' ? '#1E4D52' : '#9C948B'}
                >
                  {isBartawi && rent === 0
                    ? '—'
                    : hasBalance
                    ? `AED ${balance.toLocaleString()} due`
                    : rent > 0
                    ? `AED ${rent.toLocaleString()} ✓`
                    : '—'}
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
            const hasBalance = balance > 0

            const displayName = tenantName || companyName || room.label || '—'

            const yPos = 50 + idx * 38

            const isBartawi = room.type === 'bartawi' || room.type === 'office' || room.type === 'security' || room.type === 'cleaners' || room.type === 'restaurant'
            const isHovered = hoveredRoom === room.code

            let fillColor = 'rgba(30, 77, 82, 0.05)'
            let strokeColor = 'rgba(30, 77, 82, 0.3)'
            let strokeWidth = '1'
            let roomNumberColor = '#1A1816'
            let textColor = '#6A6159'

            if (status === 'occupied') {
              fillColor = 'rgba(30, 77, 82, 0.08)'
              strokeColor = 'rgba(30, 77, 82, 0.4)'
            }
            if (isBartawi) {
              fillColor = 'rgba(184, 136, 61, 0.1)'
              strokeColor = 'rgba(184, 136, 61, 0.5)'
              roomNumberColor = '#8B6420'
              textColor = '#8B6420'
            }
            if (status === 'vacant' && !isBartawi) {
              fillColor = 'none'
              strokeColor = '#B8883D'
              strokeWidth = '1'
            }
            if (hasBalance) {
              strokeColor = '#A84A3B'
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
                  strokeDasharray={status === 'vacant' && !isBartawi ? '4 3' : undefined}
                  rx="3"
                  className="transition-all duration-150"
                />

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
                  fontStyle={status === 'vacant' && !isBartawi ? 'italic' : 'normal'}
                >
                  {status === 'vacant' && !isBartawi
                    ? 'vacant'
                    : isBartawi
                    ? `${displayName} · Bartawi use`
                    : `${displayName.substring(0, 28)} · ${peopleCount}/8`}
                </text>

                <text
                  x="758"
                  y={yPos + 20}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="9"
                  fill={hasBalance ? '#A84A3B' : status === 'occupied' ? '#1E4D52' : '#9C948B'}
                >
                  {isBartawi && rent === 0
                    ? '—'
                    : hasBalance
                    ? `AED ${balance.toLocaleString()} due`
                    : rent > 0
                    ? `AED ${rent.toLocaleString()} ✓`
                    : '—'}
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
