'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { getBlocksByFloor, type FloorLevel, type BlockLayout } from '@/data/camp1-layout'
import { getRoomStatus, getMonthlyRent, getBalance, getPaid } from '@/lib/room-helpers'
import { cn } from '@/lib/utils'

interface SkyViewProps {
  rooms: any[]
  onBlockClick: (blockCode: string) => void
  currentFloor: FloorLevel
  onFloorChange: (floor: FloorLevel) => void
  anomalies?: string[]
}

export function SkyView({
  rooms,
  onBlockClick,
  currentFloor,
  onFloorChange,
  anomalies = [],
}: SkyViewProps) {
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)
  const blocks = getBlocksByFloor(currentFloor)

  // Compute per-block stats from real data
  const getBlockStats = (block: BlockLayout) => {
    const blockRooms = rooms.filter((r: any) => r.block?.code === block.code)
    const occupied = blockRooms.filter((r: any) => getRoomStatus(r) === 'occupied').length
    const total = blockRooms.length || block.rooms.length
    const rate = total > 0 ? (occupied / total) * 100 : 0

    const totalPaid = blockRooms.reduce((sum: number, r: any) => sum + getPaid(r), 0)
    const totalOutstanding = blockRooms.reduce((sum: number, r: any) => sum + getBalance(r), 0)
    const totalRent = blockRooms.reduce((sum: number, r: any) => sum + getMonthlyRent(r), 0)

    const hasAnomaly = block.rooms.some(r => anomalies.includes(r.code))
    return { occupied, total, rate, totalPaid, totalOutstanding, totalRent, hasAnomaly }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-start px-6 pt-6 pb-4">
        <div>
          <p className="font-serif text-[22px] italic text-espresso leading-tight">
            Camp 1 · {currentFloor === 'ground' ? 'Ground Floor' : 'First Floor'}
          </p>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            Labor Camp-1 · Plot 3650169 · {blocks.length} blocks
          </p>
        </div>
        {/* Floor toggle */}
        <div className="flex gap-1 p-1 bg-dust rounded-full">
          <button
            onClick={() => onFloorChange('ground')}
            className={cn(
              'px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase rounded-full transition-colors',
              currentFloor === 'ground'
                ? 'bg-amber text-sand'
                : 'text-stone hover:text-espresso'
            )}
          >
            Ground
          </button>
          <button
            onClick={() => onFloorChange('first')}
            className={cn(
              'px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase rounded-full transition-colors',
              currentFloor === 'first'
                ? 'bg-amber text-sand'
                : 'text-stone hover:text-espresso'
            )}
          >
            First
          </button>
        </div>
      </div>

      {/* 3×2 grid of block cards */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-4">
          {blocks.map((block) => {
            const stats = getBlockStats(block)
            const isHovered = hoveredBlock === block.code
            const isHotspot = stats.hasAnomaly

            return (
              <motion.button
                key={block.code}
                layoutId={`block-${block.code}`}
                onClick={() => onBlockClick(block.code)}
                onMouseEnter={() => setHoveredBlock(block.code)}
                onMouseLeave={() => setHoveredBlock(null)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'relative text-left bg-paper border rounded-xl p-5 transition-all duration-200',
                  isHovered
                    ? 'border-amber shadow-sm'
                    : isHotspot
                    ? 'border-rust/40'
                    : 'border-dust'
                )}
              >
                {/* Block code — large italic */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-serif italic text-[32px] text-espresso leading-none">
                      {block.code}
                    </p>
                    <p className="text-[10px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
                      {currentFloor === 'ground' ? 'Ground' : 'First'} floor
                    </p>
                  </div>
                  {isHotspot && (
                    <span className="px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase bg-rust/12 text-rust rounded-full">
                      ● Due
                    </span>
                  )}
                </div>

                {/* Occupancy bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-stone font-medium">
                      Occupancy
                    </span>
                    <span className="font-mono text-[12px] text-espresso font-medium">
                      {stats.occupied}/{stats.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-dust/60 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        stats.rate === 100 ? 'bg-teal' : 'bg-amber'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.rate}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-stone mt-1 text-right">
                    {Math.round(stats.rate)}%
                  </p>
                </div>

                {/* Financials (compact) */}
                <div className="pt-3 border-t border-dust">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] tracking-[0.1em] uppercase text-stone font-medium">
                      Collected
                    </span>
                    <span className="font-mono text-[13px] text-espresso font-medium">
                      AED {stats.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  {stats.totalOutstanding > 0 && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] tracking-[0.1em] uppercase text-rust font-medium">
                        Outstanding
                      </span>
                      <span className="font-mono text-[12px] text-rust font-medium">
                        AED {stats.totalOutstanding.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pb-6 text-[10px] tracking-[0.1em] uppercase text-stone">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal" />
          <span>Fully occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rust" />
          <span>Outstanding balance</span>
        </div>
      </div>
    </div>
  )
}
