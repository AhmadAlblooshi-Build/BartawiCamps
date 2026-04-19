'use client'

import { motion } from 'motion/react'
import { useState, useMemo } from 'react'
import {
  getBlocksByFloor,
  type FloorLevel,
  type BlockLayout,
  type RoomPosition,
} from '@/data/camp-layout'
import {
  getRoomStatus,
  getBalance,
  getPaid,
  getMonthlyRent,
  normalizeRoomCode,
} from '@/lib/room-helpers'
import { getContractInfo } from '@/lib/contract-helpers'
import { cn } from '@/lib/utils'

interface SkyViewProps {
  campCode: string
  rooms: any[]
  onBlockClick: (blockCode: string) => void
  currentFloor: FloorLevel
  onFloorChange: (floor: FloorLevel) => void
  anomalies?: string[]
}

interface RoomStripProps {
  room: RoomPosition
  apiRoom: any
  hasBalance: boolean
  hasExpired: boolean
}

// Tiny component: a single room rendered as a horizontal strip inside the mini-block
function RoomStrip({ room, apiRoom, hasBalance, hasExpired }: RoomStripProps) {
  const status = apiRoom ? getRoomStatus(apiRoom) : 'vacant'
  const isBartawi = ['bartawi', 'office', 'security', 'cleaners', 'electricity', 'mosque'].includes(
    room.type || ''
  )

  let bg = '#E8DFD3'                              // vacant/default
  if (status === 'occupied') bg = '#1E4D52'       // teal
  if (isBartawi) bg = '#B8883D'                   // amber
  if (hasExpired) bg = '#8B6420'                  // amber-gold
  if (hasBalance) bg = '#A84A3B'                  // rust (highest priority)

  return <div style={{ flex: 1, background: bg, borderRadius: '1px' }} />
}

export function SkyView({
  campCode,
  rooms,
  onBlockClick,
  currentFloor,
  onFloorChange,
  anomalies,
}: SkyViewProps) {
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)
  const blocks = getBlocksByFloor(campCode, currentFloor)

  // Build a lookup map for fast room-to-API matching
  // Store both raw and normalized keys to handle format differences (A01 vs A-1)
  const roomsByCode = useMemo(() => {
    const map = new Map<string, any>()
    rooms.forEach((r: any) => {
      if (r.room_number) {
        map.set(r.room_number, r)
        map.set(normalizeRoomCode(r.room_number), r)
      }
    })
    return map
  }, [rooms])

  // Per-block stats computed from real API data
  const getBlockStats = (block: BlockLayout) => {
    const blockRooms = rooms.filter((r: any) => r.block?.code === block.code)
    const occupied = blockRooms.filter((r: any) => getRoomStatus(r) === 'occupied').length
    const total = blockRooms.length || block.rooms.length
    const rate = total > 0 ? (occupied / total) * 100 : 0

    const totalPaid = blockRooms.reduce((sum: number, r: any) => sum + getPaid(r), 0)
    const totalOutstanding = blockRooms.reduce((sum: number, r: any) => sum + getBalance(r), 0)
    const totalRent = blockRooms.reduce((sum: number, r: any) => sum + getMonthlyRent(r), 0)

    return { occupied, total, rate, totalPaid, totalOutstanding, totalRent }
  }

  // Split a block's rooms into left column, right column, and extras
  const splitBlockRooms = (block: BlockLayout) => {
    const left = block.rooms.filter(r => r.x === 0 && r.y <= 220)
    const right = block.rooms.filter(r => r.x > 0 && r.y <= 220)
    const extras = block.rooms.filter(r => r.y > 220)
    return { left, right, extras }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-start px-7 pt-6 pb-4">
        <div>
          <p className="font-serif text-[22px] italic text-espresso leading-tight">
            {campCode.includes('camp-02') || campCode.includes('camp2')
              ? 'Camp 2'
              : 'Camp 1'} · {currentFloor === 'ground' ? 'Ground Floor' : 'First Floor'}
          </p>
          <p className="text-[10px] tracking-[0.14em] uppercase text-stone mt-1 font-medium">
            Labor Camp · {blocks.length} blocks · {blocks.reduce((s, b) => s + b.rooms.length, 0)} rooms
          </p>
        </div>
        {/* Floor toggle */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '3px',
            background: 'rgba(214, 207, 197, 0.5)',
            borderRadius: '999px',
          }}
        >
          <button
            onClick={() => onFloorChange('ground')}
            style={{
              padding: '6px 16px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: currentFloor === 'ground' ? '#1A1816' : 'transparent',
              color: currentFloor === 'ground' ? '#FAF7F2' : '#6A6159',
            }}
          >
            Ground
          </button>
          <button
            onClick={() => onFloorChange('first')}
            style={{
              padding: '6px 16px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: currentFloor === 'first' ? '#1A1816' : 'transparent',
              color: currentFloor === 'first' ? '#FAF7F2' : '#6A6159',
            }}
          >
            First
          </button>
        </div>
      </div>

      {/* 3×2 grid of architectural editorial cards */}
      <div className="px-7 pb-5">
        <div className="grid grid-cols-3 gap-[18px]">
          {blocks.map((block) => {
            const stats = getBlockStats(block)
            const blockRooms = rooms.filter((r: any) => r.block?.code === block.code)

            // Expired contract detection
            const expiredRoomCodes = new Set(
              blockRooms
                .filter(r => getContractInfo(r).status === 'expired')
                .map(r => r.room_number)
            )
            const hasExpired = expiredRoomCodes.size > 0

            const isHovered = hoveredBlock === block.code
            const hasOutstanding = stats.totalOutstanding > 0
            const { left, right } = splitBlockRooms(block)

            return (
              <motion.button
                key={block.code}
                layoutId={`block-${block.code}`}
                onClick={() => onBlockClick(block.code)}
                onMouseEnter={() => setHoveredBlock(block.code)}
                onMouseLeave={() => setHoveredBlock(null)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  position: 'relative',
                  textAlign: 'left',
                  background: '#FFFFFF',
                  border: isHovered
                    ? '1px solid #B8883D'
                    : hasOutstanding
                    ? '1px solid rgba(168, 74, 59, 0.5)'
                    : hasExpired
                    ? '1px solid rgba(139, 100, 32, 0.5)'
                    : '0.5px solid #D6CFC5',
                  borderRadius: '12px',
                  padding: '20px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  overflow: 'hidden',
                  boxShadow: isHovered
                    ? '0 4px 20px rgba(184, 136, 61, 0.25), 0 0 0 1px rgba(184, 136, 61, 0.15)'
                    : hasOutstanding
                    ? '0 0 0 1px rgba(168, 74, 59, 0.3), 0 2px 12px rgba(168, 74, 59, 0.12)'
                    : hasExpired
                    ? '0 0 0 1px rgba(139, 100, 32, 0.25), 0 2px 12px rgba(139, 100, 32, 0.1)'
                    : 'none',
                }}
              >
                {/* "Due" or "Expired" badge in top-right corner */}
                {(hasOutstanding || hasExpired) && (
                  <div className="absolute top-3 right-3.5 flex items-center gap-1">
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '999px',
                      background: hasOutstanding ? '#A84A3B' : '#8B6420'
                    }} />
                    <span style={{
                      fontSize: '9px',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: hasOutstanding ? '#A84A3B' : '#8B6420',
                      fontWeight: 600
                    }}>
                      {hasOutstanding ? 'Due' : 'Expired'}
                    </span>
                  </div>
                )}

                {/* Top row: Block letter + occupancy stats */}
                <div className="flex justify-between items-start mb-4">
                  <p
                    className="font-serif italic text-[44px] text-espresso leading-none"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    {block.code}
                  </p>
                  <div className={cn('text-right', hasOutstanding && 'pt-5')}>
                    <p className="font-mono text-[22px] text-teal font-medium leading-none" style={{ letterSpacing: '-0.02em' }}>
                      {Math.round(stats.rate)}
                      <span className="text-[12px] text-stone">%</span>
                    </p>
                    <p className="text-[9px] tracking-[0.12em] uppercase text-stone mt-1 font-medium font-mono">
                      {stats.occupied}/{stats.total}
                    </p>
                  </div>
                </div>

                {/* Miniature room layout — the signature feature */}
                <div
                  className="grid mb-4 rounded bg-[#F4EFE7] p-1"
                  style={{
                    gridTemplateColumns: '1fr 8px 1fr',
                    gap: '1px',
                    height: '122px',
                  }}
                >
                  {/* Left column: rooms 1-11 */}
                  <div className="flex flex-col gap-[1px]">
                    {left.map((room) => {
                      const apiRoom = roomsByCode.get(room.code) || roomsByCode.get(normalizeRoomCode(room.code))
                      const hasBalance = apiRoom ? getBalance(apiRoom) > 0 : false
                      const hasExpired = apiRoom ? getContractInfo(apiRoom).status === 'expired' : false
                      return (
                        <RoomStrip
                          key={room.code}
                          room={room}
                          apiRoom={apiRoom}
                          hasBalance={hasBalance}
                          hasExpired={hasExpired}
                        />
                      )
                    })}
                  </div>

                  {/* Corridor */}
                  <div className="bg-[#E8DFD3] rounded-[1px]" />

                  {/* Right column: rooms 22-12 */}
                  <div className="flex flex-col gap-[1px]">
                    {right.map((room) => {
                      const apiRoom = roomsByCode.get(room.code) || roomsByCode.get(normalizeRoomCode(room.code))
                      const hasBalance = apiRoom ? getBalance(apiRoom) > 0 : false
                      const hasExpired = apiRoom ? getContractInfo(apiRoom).status === 'expired' : false
                      return (
                        <RoomStrip
                          key={room.code}
                          room={room}
                          apiRoom={apiRoom}
                          hasBalance={hasBalance}
                          hasExpired={hasExpired}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Bottom row: Collected, Outstanding, or Expired */}
                <div className="flex justify-between items-baseline pt-3.5 border-t border-dust">
                  {hasOutstanding ? (
                    <>
                      <span className="text-[9px] tracking-[0.12em] uppercase text-rust font-semibold">
                        Outstanding
                      </span>
                      <span className="font-mono text-[13px] text-rust font-medium">
                        AED {stats.totalOutstanding.toLocaleString()}
                      </span>
                    </>
                  ) : hasExpired ? (
                    <>
                      <span className="text-[9px] tracking-[0.12em] uppercase font-semibold" style={{ color: '#8B6420' }}>
                        {expiredRoomCodes.size} Expired
                      </span>
                      <span className="font-mono text-[13px] font-medium" style={{ color: '#8B6420' }}>
                        Renewal needed
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] tracking-[0.12em] uppercase text-stone font-medium">
                        Collected
                      </span>
                      <span className="font-mono text-[13px] text-espresso font-medium">
                        AED {stats.totalPaid.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          margin: '0 28px 24px',
          padding: '14px',
          background: 'rgba(30, 77, 82, 0.04)',
          borderRadius: '10px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { color: '#1E4D52', label: 'Occupied' },
          { color: '#B8883D', label: 'Bartawi use' },
          { color: '#A84A3B', label: 'Outstanding' },
          { color: '#8B6420', label: 'Expired contract' },
          { color: '#E8DFD3', label: 'Corridor', border: true },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: item.color,
              borderRadius: '2px',
              border: item.border ? '0.5px solid #D6CFC5' : 'none',
            }} />
            <span style={{
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6A6159',
              fontWeight: 500,
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
