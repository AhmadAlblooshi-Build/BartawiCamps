'use client'
import { motion } from 'motion/react'
import { BlockDefinition } from '@/data/camp1-layout'
import { cn } from '@/lib/utils'
import { getRoomStatus } from '@/lib/room-helpers'

interface BlockCardProps {
  block: BlockDefinition
  rooms: any[]
  onClick: () => void
  layoutId: string
}

export function BlockCard({ block, rooms, onClick, layoutId }: BlockCardProps) {
  // Calculate stats
  const totalRooms = rooms.length
  const occupiedCount = rooms.filter(r => getRoomStatus(r) === 'occupied').length
  const occupancyRate = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0

  // Determine block status coloring based on occupancy
  const getBlockBorderColor = () => {
    if (occupancyRate === 100) return 'border-teal'
    if (occupancyRate > 80) return 'border-teal/60'
    if (occupancyRate >= 50) return 'border-amber'
    return 'border-rust'
  }

  const getBlockTint = () => {
    if (occupancyRate === 100) return 'bg-teal/5'
    if (occupancyRate < 50) return 'bg-rust/3'
    return 'bg-transparent'
  }

  // Get room status color for mini grid
  const getRoomColor = (room: any) => {
    const status = getRoomStatus(room)
    switch (status) {
      case 'occupied': return 'bg-teal'
      case 'vacant': return 'border border-amber bg-transparent'
      case 'vacating': return 'bg-ochre'
      case 'bartawi_use': return 'bg-sand-300'
      case 'maintenance': return 'bg-rust'
      default: return 'bg-sand-300'
    }
  }

  // Split rooms into left and right columns for display
  const leftColumn = rooms.slice(0, 11)
  const rightColumn = rooms.slice(11, 22)

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      className={cn(
        'bezel elevation-hover cursor-pointer rounded-lg p-6',
        'w-[200px] h-[300px] flex flex-col',
        'border-[1.5px] transition-all duration-200',
        getBlockBorderColor(),
        getBlockTint()
      )}
      whileHover={{ scale: 1.02 }}
    >
      {/* TOP AREA: Block code and floor */}
      <div className="flex flex-col items-center mb-4">
        <div className="font-display text-[28px] italic" style={{ color: 'var(--color-espresso)' }}>
          {block.code}
        </div>
        <div className="eyebrow text-[10px] mt-1">
          {block.floor === 'ground' ? 'GROUND' : 'FIRST FLOOR'}
        </div>
      </div>

      {/* MIDDLE AREA: Mini room grid */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-1.5">
          {leftColumn.map((room) => (
            <div
              key={room.id}
              className={cn('w-[5px] h-[5px] rounded-full', getRoomColor(room))}
            />
          ))}
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-1.5">
          {rightColumn.map((room) => (
            <div
              key={room.id}
              className={cn('w-[5px] h-[5px] rounded-full', getRoomColor(room))}
            />
          ))}
        </div>
      </div>

      {/* BOTTOM AREA: Occupancy stats */}
      <div className="mt-auto">
        <div className="data-md text-center mb-2">
          {occupiedCount}/{totalRooms}
        </div>
        <div className="w-full h-[4px] bg-sand-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal transition-all duration-300"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}
