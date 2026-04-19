'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import {
  getBlocksByFloor,
  CAMP1_FACILITIES,
  type FloorLevel,
  type BlockLayout,
} from '@/data/camp1-layout'
import { getRoomStatus } from '@/lib/room-helpers'
import { cn } from '@/lib/utils'

interface SkyViewProps {
  rooms: any[]                              // API rooms data for current camp
  onBlockClick: (blockCode: string) => void
  currentFloor: FloorLevel
  onFloorChange: (floor: FloorLevel) => void
  anomalies?: string[]                      // Optional: array of room codes with outstanding balance
}

export function SkyView({
  rooms,
  onBlockClick,
  currentFloor,
  onFloorChange,
  anomalies = [],
}: SkyViewProps) {
  const blocks = getBlocksByFloor(currentFloor)
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)

  // Compute per-block stats from real data
  const getBlockStats = (block: BlockLayout) => {
    const blockRooms = rooms.filter(r => r.block?.code === block.code)
    const occupied = blockRooms.filter(r => getRoomStatus(r) === 'occupied').length
    const total = blockRooms.length || block.rooms.length
    const rate = total > 0 ? (occupied / total) * 100 : 0
    const hasAnomaly = block.rooms.some(r => anomalies.includes(r.code))
    return { occupied, total, rate, hasAnomaly }
  }

  return (
    <div className="relative w-full">
      {/* Mobile fallback - simple block list */}
      <div className="sm:hidden px-4 py-6 space-y-4">
        <div>
          <p className="font-serif text-[22px] italic text-espresso leading-tight">
            Camp 1 · {currentFloor === 'ground' ? 'Ground Floor' : 'First Floor'}
          </p>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            Labor Camp-1 · Plot 3650169 · {blocks.length} blocks
          </p>
        </div>

        {/* Floor toggle */}
        <div className="flex gap-1 p-1 bg-dust rounded-full w-fit">
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

        {/* 2-column block grid */}
        <div className="grid grid-cols-2 gap-3">
          {blocks.map(block => {
            const stats = getBlockStats(block)
            const isHotspot = stats.hasAnomaly

            return (
              <button
                key={block.code}
                onClick={() => onBlockClick(block.code)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  isHotspot
                    ? 'border-rust bg-rust/5'
                    : 'border-dust bg-paper hover:bg-dust/30'
                )}
              >
                <p className="font-serif text-[20px] italic text-espresso">{block.code}</p>
                <p className="font-mono text-[11px] text-stone mt-1">
                  {stats.occupied}/{stats.total} · {Math.round(stats.rate)}%
                </p>
                <div className="w-full h-1 bg-dust rounded-full mt-2 overflow-hidden">
                  <div
                    className={cn('h-full', isHotspot ? 'bg-rust' : 'bg-teal')}
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop SVG view - hidden on mobile */}
      <div className="hidden sm:block">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 px-6 pt-6">
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

      {/* The architectural SVG */}
      <div className="px-4 pb-6">
        <motion.svg
          viewBox="0 0 1000 800"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Background grid (architectural feel) */}
          <defs>
            <pattern id="micro-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(214,207,197,0.3)"
                strokeWidth="0.5"
              />
            </pattern>
            <pattern id="major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="rgba(214,207,197,0.5)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="1000" height="800" fill="url(#micro-grid)" />
          <rect width="1000" height="800" fill="url(#major-grid)" />

          {/* Steel fence perimeter (dashed) */}
          <rect
            x="10"
            y="10"
            width="980"
            height="780"
            fill="none"
            stroke="#D6CFC5"
            strokeWidth="2"
            strokeDasharray="3 4"
          />

          {/* Front entrance label */}
          <text
            x="500"
            y="28"
            textAnchor="middle"
            fontFamily="Geist, Inter, sans-serif"
            fontSize="10"
            letterSpacing="2"
            fill="#9C948B"
          >
            ▼ FRONT ENTRANCE · NORTH
          </text>

          {/* Back door label */}
          <text
            x="500"
            y="790"
            textAnchor="middle"
            fontFamily="Geist, Inter, sans-serif"
            fontSize="10"
            letterSpacing="2"
            fill="#9C948B"
          >
            ▲ BACK DOOR · SOUTH
          </text>

          {/* Retail strip */}
          {CAMP1_FACILITIES.filter(f => f.type === 'retail').map(shop => (
            <g key={shop.id}>
              <rect
                x={shop.x}
                y={shop.y}
                width={shop.width}
                height={shop.height}
                fill="#F4EFE7"
                stroke="#D6CFC5"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x={shop.x + shop.width / 2}
                y={shop.y + shop.height / 2 - 2}
                textAnchor="middle"
                fontFamily="Geist, Inter, sans-serif"
                fontSize="8"
                fontWeight="500"
                fill="#6A6159"
              >
                {shop.name.split(' ')[0].toUpperCase()}
              </text>
              <text
                x={shop.x + shop.width / 2}
                y={shop.y + shop.height / 2 + 9}
                textAnchor="middle"
                fontFamily="Geist, Inter, sans-serif"
                fontSize="7"
                fill="#9C948B"
              >
                {shop.name.split(' ').slice(1).join(' ').substring(0, 14)}
              </text>
            </g>
          ))}

          {/* Bus stop */}
          {CAMP1_FACILITIES.filter(f => f.type === 'bus_stop').map(f => (
            <g key={f.id}>
              <rect
                x={f.x}
                y={f.y}
                width={f.width}
                height={f.height}
                fill="#E8E0D6"
                stroke="#D6CFC5"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x={f.x + f.width / 2}
                y={f.y + f.height / 2 + 3}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="8"
                letterSpacing="1"
                fill="#6A6159"
              >
                BUS STOP
              </text>
            </g>
          ))}

          {/* Security room */}
          {CAMP1_FACILITIES.filter(f => f.type === 'security_room').map(f => (
            <g key={f.id}>
              <rect
                x={f.x}
                y={f.y}
                width={f.width}
                height={f.height}
                fill="#E8E0D6"
                stroke="#D6CFC5"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x={f.x + f.width / 2}
                y={f.y + f.height / 2 + 3}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="8"
                letterSpacing="1"
                fill="#6A6159"
              >
                SECURITY
              </text>
            </g>
          ))}

          {/* Kitchen corridor */}
          {CAMP1_FACILITIES.filter(f => f.type === 'kitchen_corridor').map(f => (
            <g key={f.id}>
              <rect
                x={f.x}
                y={f.y}
                width={f.width}
                height={f.height}
                fill="#E8E0D6"
                stroke="#D6CFC5"
                strokeWidth="0.5"
                rx="2"
              />
              <text
                x={f.x + f.width / 2}
                y={f.y + f.height / 2 + 3}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                letterSpacing="3"
                fontWeight="500"
                fill="#6A6159"
              >
                {f.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Mosque */}
          {CAMP1_FACILITIES.filter(f => f.type === 'mosque').map(f => (
            <g key={f.id}>
              <rect
                x={f.x}
                y={f.y}
                width={f.width}
                height={f.height}
                fill="#D8E3E4"
                stroke="#1E4D52"
                strokeWidth="0.8"
                rx="4"
              />
              {/* Dome shape */}
              <path
                d={`M ${f.x + 15} ${f.y + 22} Q ${f.x + f.width / 2} ${f.y + 12} ${f.x + f.width - 15} ${f.y + 22}`}
                fill="none"
                stroke="#1E4D52"
                strokeWidth="1"
              />
              <text
                x={f.x + f.width / 2}
                y={f.y + f.height - 6}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                letterSpacing="2"
                fontWeight="500"
                fill="#1E4D52"
              >
                MOSQUE
              </text>
            </g>
          ))}

          {/* Other utility rooms — only on ground floor */}
          {currentFloor === 'ground' &&
            CAMP1_FACILITIES.filter(f =>
              ['gas_room', 'pump_room', 'water_tank', 'store', 'ac_room', 'substation'].includes(f.type)
            ).map(f => (
              <g key={f.id}>
                <rect
                  x={f.x}
                  y={f.y}
                  width={f.width}
                  height={f.height}
                  fill="#F0E8D6"
                  stroke="#D6CFC5"
                  strokeWidth="0.5"
                  rx="1"
                />
                <text
                  x={f.x + f.width / 2}
                  y={f.y + f.height / 2 + 3}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="7"
                  fill="#6A6159"
                >
                  {f.name.toUpperCase().substring(0, 10)}
                </text>
              </g>
            ))}

          {/* BLOCKS — the main interactive elements */}
          {blocks.map(block => {
            const stats = getBlockStats(block)
            const isHotspot = stats.hasAnomaly
            const isHovered = hoveredBlock === block.code

            // Color based on occupancy
            let fillColor = 'rgba(30, 77, 82, 0.08)'
            let strokeColor = 'rgba(30, 77, 82, 0.4)'
            if (stats.rate === 100) {
              fillColor = 'rgba(30, 77, 82, 0.12)'
              strokeColor = 'rgba(30, 77, 82, 0.5)'
            } else if (stats.rate < 50) {
              fillColor = 'rgba(184, 136, 61, 0.1)'
              strokeColor = 'rgba(184, 136, 61, 0.5)'
            }
            if (isHotspot) {
              strokeColor = '#A84A3B'
            }
            // Hover state overrides
            if (isHovered) {
              fillColor = 'rgba(184, 136, 61, 0.12)'
              strokeColor = '#B8883D'
            }

            return (
              <motion.g
                key={block.code}
                layoutId={`block-${block.code}`}
                onMouseEnter={() => setHoveredBlock(block.code)}
                onMouseLeave={() => setHoveredBlock(null)}
                className="cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ transformOrigin: `${block.skyX + block.skyWidth / 2}px ${block.skyY + block.skyHeight / 2}px` }}
              >
                {/* Block outline */}
                <rect
                  x={block.skyX}
                  y={block.skyY}
                  width={block.skyWidth}
                  height={block.skyHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? '2.5' : (isHotspot ? '2' : '1.5')}
                  rx="4"
                  className="transition-all duration-200"
                />

                {/* Block code (large italic) */}
                <text
                  x={block.labelX}
                  y={block.skyY + 28}
                  textAnchor="middle"
                  fontFamily="Fraunces, Georgia, serif"
                  fontStyle="italic"
                  fontSize="22"
                  fontWeight="500"
                  fill="#1A1816"
                >
                  {block.code}
                </text>

                {/* Stats line */}
                <text
                  x={block.labelX}
                  y={block.skyY + 44}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="8"
                  letterSpacing="1"
                  fill="#6A6159"
                >
                  {stats.occupied}/{stats.total} · {Math.round(stats.rate)}%
                </text>

                {/* Mini room grid — visual density indicator */}
                {block.rooms.slice(0, 22).map((room, idx) => {
                  const apiRoom = rooms.find(r => r.room_number === room.code)
                  const status = apiRoom ? getRoomStatus(apiRoom) : 'vacant'
                  const hasAnomaly = anomalies.includes(room.code)

                  const col = idx % 11
                  const row = Math.floor(idx / 11)
                  const dotX = block.skyX + 10 + col * 7
                  const dotY = block.skyY + 60 + row * 10

                  let dotFill = '#E8DFD3'
                  let dotStroke = '#D6CFC5'
                  if (status === 'occupied') dotFill = '#1E4D52'
                  if (room.type === 'bartawi' || room.type === 'office' || room.type === 'security' || room.type === 'cleaners') {
                    dotFill = '#B8883D'
                  }
                  if (hasAnomaly) {
                    dotFill = '#A84A3B'
                    dotStroke = '#A84A3B'
                  }

                  return (
                    <circle
                      key={room.code}
                      cx={dotX}
                      cy={dotY}
                      r="2.5"
                      fill={dotFill}
                      stroke={dotStroke}
                      strokeWidth="0.4"
                    />
                  )
                })}

                {/* Progress bar at bottom */}
                <g>
                  <rect
                    x={block.skyX + 10}
                    y={block.skyY + block.skyHeight - 20}
                    width={block.skyWidth - 20}
                    height="3"
                    fill="#E8DFD3"
                    rx="1.5"
                  />
                  <rect
                    x={block.skyX + 10}
                    y={block.skyY + block.skyHeight - 20}
                    width={(block.skyWidth - 20) * (stats.rate / 100)}
                    height="3"
                    fill={isHotspot ? '#A84A3B' : '#1E4D52'}
                    rx="1.5"
                  />
                </g>
              </motion.g>
            )
          })}
        </motion.svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pb-6 text-[10px] tracking-[0.1em] uppercase text-stone">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full border border-dust bg-transparent" />
          <span>Vacant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber" />
          <span>Bartawi use</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rust" />
          <span>Outstanding</span>
        </div>
      </div>
      </div>
    </div>
  )
}
