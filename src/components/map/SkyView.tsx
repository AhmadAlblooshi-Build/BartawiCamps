'use client'
import { motion, AnimatePresence } from 'motion/react'
import { BlockCard } from './BlockCard'
import { FloorToggle } from './FloorToggle'
import { KitchenCorridor } from './KitchenCorridor'
import { MosqueMarker } from './MosqueMarker'
import { RetailStrip } from './RetailStrip'
import { MapLegend } from './MapLegend'
import { getBlocksByFloor } from '@/data/camp1-layout'

interface RoomData {
  id: string
  room_number: string
  status: string
  block?: { code: string }
  current_occupancy: { people_count: number } | null
  max_capacity: number
  standard_rent: number
}

interface SkyViewProps {
  floor: 'ground' | 'first'
  onFloorChange: (floor: 'ground' | 'first') => void
  rooms: RoomData[]
  onBlockClick: (blockCode: string) => void
  selectedBlock: string | null
}

export function SkyView({ floor, onFloorChange, rooms, onBlockClick, selectedBlock }: SkyViewProps) {
  const blocks = getBlocksByFloor(floor)

  // Group rooms by block code
  const roomsByBlock = new Map<string, RoomData[]>()
  for (const room of rooms) {
    const blockCode = room.block?.code || 'Unknown'
    if (!roomsByBlock.has(blockCode)) {
      roomsByBlock.set(blockCode, [])
    }
    roomsByBlock.get(blockCode)!.push(room)
  }

  return (
    <div className="bezel atmosphere-strong p-8 rounded-xl" style={{
      background: `
        repeating-linear-gradient(0deg, rgba(214,207,197,0.03) 0px, transparent 1px, transparent 20px, rgba(214,207,197,0.03) 21px),
        repeating-linear-gradient(90deg, rgba(214,207,197,0.03) 0px, transparent 1px, transparent 20px, rgba(214,207,197,0.03) 21px),
        var(--color-sand-50)
      `
    }}>
      {/* Header: Floor toggle and floor indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bezel bg-sand-100 px-3 py-1.5 rounded-lg">
            <span className="eyebrow text-[10px]">
              {floor === 'ground' ? 'GF' : '1F'}
            </span>
          </div>
          <h3 className="font-display text-xl italic" style={{ color: 'var(--color-espresso)' }}>
            {floor === 'ground' ? 'Ground Floor' : 'First Floor'}
          </h3>
        </div>
        <FloorToggle floor={floor} onChange={onFloorChange} />
      </div>

      {/* Retail strip */}
      <RetailStrip />

      {/* Block grid with AnimatePresence for floor switching */}
      <AnimatePresence mode="wait">
        <motion.div
          key={floor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-12"
        >
          {/* Row 0 (top row: A/B/C or AA/BB/CC) */}
          <div className="flex items-start justify-center gap-4">
            {blocks.filter(b => b.position.row === 0).map(block => {
              const blockRooms = roomsByBlock.get(block.code) || []
              return (
                <AnimatePresence key={block.code}>
                  {selectedBlock !== block.code && (
                    <motion.div
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <BlockCard
                        block={block}
                        rooms={blockRooms}
                        onClick={() => onBlockClick(block.code)}
                        layoutId={`block-${block.code}`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            })}
          </div>

          {/* Kitchen corridor */}
          <KitchenCorridor />

          {/* Row 1 (bottom row: D/E/F or DD/EE/FF) */}
          <div className="flex items-start justify-center gap-4 relative">
            {blocks.filter(b => b.position.row === 1).map(block => {
              const blockRooms = roomsByBlock.get(block.code) || []
              return (
                <AnimatePresence key={block.code}>
                  {selectedBlock !== block.code && (
                    <motion.div
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <BlockCard
                        block={block}
                        rooms={blockRooms}
                        onClick={() => onBlockClick(block.code)}
                        layoutId={`block-${block.code}`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            })}

            {/* Mosque marker (only on ground floor, positioned between blocks) */}
            {floor === 'ground' && <MosqueMarker />}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-8">
        <MapLegend />
      </div>
    </div>
  )
}
