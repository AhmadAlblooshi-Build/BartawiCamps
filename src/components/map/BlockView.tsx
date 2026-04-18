'use client'
import { motion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { RoomCard } from './RoomCard'
import { CorridorStrip } from './CorridorStrip'
import { getBlockByCode } from '@/data/camp1-layout'
import { spring } from '@/lib/motion'

interface RoomData {
  id: string
  room_number: string
  status: string
  room_size: string
  max_capacity: number
  standard_rent: number
  current_occupancy: {
    people_count: number
    monthly_rent: number
    individual: { owner_name: string } | null
    company: { name: string } | null
  } | null
}

interface BlockViewProps {
  blockCode: string
  rooms: RoomData[]
  onBack: () => void
  onRoomClick: (roomId: string) => void
  selectedRoom: string | null
}

// Spring configuration for block dive animation
const blockDiveSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 32,
  mass: 1,
}

const roomVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

const roomStaggerTransition = {
  staggerChildren: 0.03,
  delayChildren: 0.25,
}

export function BlockView({ blockCode, rooms, onBack, onRoomClick, selectedRoom }: BlockViewProps) {
  const block = getBlockByCode(blockCode)

  if (!block) {
    return <div>Block not found</div>
  }

  // Calculate stats
  const totalRooms = rooms.length
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length
  const vacantCount = rooms.filter(r => r.status === 'vacant').length
  const totalRent = rooms.reduce((sum, r) => sum + (r.current_occupancy?.monthly_rent || r.standard_rent), 0)

  // Mock collection data (would come from API)
  const totalCollected = totalRent * 0.967
  const collectionRate = totalRent > 0 ? (totalCollected / totalRent) * 100 : 0

  // Split rooms into left and right columns (matching the layout.ts structure)
  const leftColumn = rooms.slice(0, 11)
  const rightColumn = rooms.slice(11, 22)

  return (
    <motion.div
      layoutId={`block-${blockCode}`}
      transition={blockDiveSpring}
      className="bezel atmosphere-strong p-8 rounded-xl w-full"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-espresso-muted hover:text-espresso transition-colors group"
          >
            <Icon icon={ArrowLeft} size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to map</span>
          </button>
          <div className="flex items-center gap-4 text-sm">
            <span className="data-sm">{totalRooms} rooms</span>
            <span className="text-espresso-muted">·</span>
            <span className="data-sm text-teal">{occupiedCount} occ</span>
            <span className="text-espresso-muted">·</span>
            <span className="data-sm text-amber">{vacantCount} vac</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-2xl italic" style={{ color: 'var(--color-espresso)' }}>
            {block.label}
          </h2>
          <span className="eyebrow text-[11px]">
            {block.floor === 'ground' ? 'GROUND FLOOR' : 'FIRST FLOOR'}
          </span>
        </div>

        <div className="divider-warm" />
      </motion.div>

      {/* Room grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={roomStaggerTransition}
        className="flex items-start justify-center gap-6 mb-8"
      >
        {/* Left column (rooms 1-11) */}
        <div className="flex flex-col gap-3">
          {leftColumn.map((room, index) => (
            <motion.div
              key={room.id}
              variants={roomVariants}
              custom={index}
            >
              {selectedRoom !== room.id && (
                <RoomCard
                  room={room}
                  onClick={() => onRoomClick(room.id)}
                  layoutId={`room-${room.id}`}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Corridor */}
        <CorridorStrip />

        {/* Right column (rooms 22-12) */}
        <div className="flex flex-col gap-3">
          {rightColumn.map((room, index) => (
            <motion.div
              key={room.id}
              variants={roomVariants}
              custom={index}
            >
              {selectedRoom !== room.id && (
                <RoomCard
                  room={room}
                  onClick={() => onRoomClick(room.id)}
                  layoutId={`room-${room.id}`}
                />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.2 }}
        className="divider-warm mb-4"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-espresso-muted">Total rent</span>
          <span className="data-md font-semibold">AED {totalRent.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-espresso-muted">Collected</span>
          <span className="data-md">AED {Math.round(totalCollected).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-espresso-muted">Collection rate</span>
          <div className="flex-1 h-2 bg-sand-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal transition-all duration-300"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <span className="data-sm font-semibold">{collectionRate.toFixed(1)}%</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
