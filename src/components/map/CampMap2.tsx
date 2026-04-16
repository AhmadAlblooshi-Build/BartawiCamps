'use client'
import { RoomCell } from './RoomCell'
import type { RoomStatusFilter } from './CampMapView'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { MapTrifold } from '@phosphor-icons/react'

interface Props {
  rooms: any[]
  floor: 'ground' | 'first' | 'both'
  filter: RoomStatusFilter
  onSelect: (roomId: string) => void
}

// Camp 2 has 16 wings: A, AA, B, BB, C, CC, D, DD, E, EE, F, FF, S, SS, U, UU
const BLOCK_SPECS_GROUND = [
  { code: 'A',  count: 5  },
  { code: 'B',  count: 14 },
  { code: 'C',  count: 12 },
  { code: 'D',  count: 14 },
  { code: 'E',  count: 14 },
  { code: 'F',  count: 5  },
  { code: 'S',  count: 1  },
  { code: 'U',  count: 19 },
]
const BLOCK_SPECS_FIRST = [
  { code: 'AA', count: 6  },
  { code: 'BB', count: 14 },
  { code: 'CC', count: 12 },
  { code: 'DD', count: 14 },
  { code: 'EE', count: 14 },
  { code: 'FF', count: 5  },
  { code: 'SS', count: 6  },
  { code: 'UU', count: 24 },
]

const ROOM_W = 40
const ROOM_H = 22
const ROOM_GAP = 2

export function CampMap2({ rooms, floor, filter, onSelect }: Props) {
  const hasFpCoords = rooms.some(r => r.fp_x !== null && r.fp_y !== null)

  if (hasFpCoords) {
    return <CampMap2FloorPlan rooms={rooms} filter={filter} onSelect={onSelect} />
  }

  return <CampMap2BlockGrid rooms={rooms} floor={floor} filter={filter} onSelect={onSelect} />
}

/* -- SVG floorplan mode — used when admin has uploaded map and set fp_x/fp_y on rooms -- */

function CampMap2FloorPlan({ rooms, filter, onSelect }: { rooms: any[]; filter: RoomStatusFilter; onSelect: (id: string) => void }) {
  const isDim = (r: any) => {
    if (filter === 'all') return false
    const tests: Record<string, (r: any) => boolean> = {
      occupied: r => r.status === 'occupied',
      vacant:   r => r.status === 'vacant',
      vacating: r => r.status === 'vacating',
      bartawi_use: r => r.status === 'bartawi_use',
      overdue:  r => r.has_overdue_balance === true,
      legal_dispute: r => r.current_occupancy?.contract?.status === 'legal_dispute',
      maintenance: r => r.status === 'maintenance',
    }
    const pass = tests[filter]
    return pass ? !pass(r) : false
  }

  // Compute bounding box from fp_* fields
  const xs = rooms.filter(r => r.fp_x !== null).map(r => r.fp_x)
  const ys = rooms.filter(r => r.fp_y !== null).map(r => r.fp_y)
  const maxX = Math.max(...xs, 0) + 80
  const maxY = Math.max(...ys, 0) + 80

  return (
    <div className="w-full overflow-auto">
      <svg viewBox={`0 0 ${maxX} ${maxY}`} className="w-full h-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <rect width={maxX} height={maxY} fill="#FAF7F2" rx={10} />
        {rooms.filter(r => r.fp_x !== null && r.fp_y !== null).map(r => (
          <RoomCell
            key={r.id}
            room={r}
            x={r.fp_x}
            y={r.fp_y}
            w={r.fp_width || ROOM_W}
            h={r.fp_height || ROOM_H}
            dim={isDim(r)}
            onClick={() => onSelect(r.id)}
          />
        ))}
      </svg>
    </div>
  )
}

/* -- Fallback block-grid mode — used until admin configures the real floor plan -- */

function CampMap2BlockGrid({ rooms, floor, filter, onSelect }: Props) {
  const showGround = floor === 'ground' || floor === 'both'
  const showFirst  = floor === 'first'  || floor === 'both'

  const byNumber = new Map<string, any>()
  rooms.forEach(r => byNumber.set(r.room_number, r))

  const isDim = (r: any) => {
    if (filter === 'all' || !r) return false
    const tests: Record<string, (r: any) => boolean> = {
      occupied: r => r.status === 'occupied',
      vacant:   r => r.status === 'vacant',
      vacating: r => r.status === 'vacating',
      bartawi_use: r => r.status === 'bartawi_use',
      overdue:  r => r.has_overdue_balance === true,
      legal_dispute: r => r.current_occupancy?.contract?.status === 'legal_dispute',
      maintenance: r => r.status === 'maintenance',
    }
    const pass = tests[filter]
    return pass ? !pass(r) : false
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px]">
        <Icon icon={MapTrifold} size={14} className="text-amber-600" />
        <div className="flex-1 text-espresso-soft">
          <span className="font-medium">Block-grid fallback view.</span>{' '}
          Upload the Camp 2 layout image in{' '}
          <Link href="/admin/settings" className="text-amber-600 underline font-medium">admin settings</Link>
          {' '}to render the true floor plan.
        </div>
      </div>

      <div className="space-y-8">
        {showGround && <Floor label="Ground Floor" specs={BLOCK_SPECS_GROUND} byNumber={byNumber} onSelect={onSelect} isDim={isDim} />}
        {showFirst  && <Floor label="First Floor"  specs={BLOCK_SPECS_FIRST}  byNumber={byNumber} onSelect={onSelect} isDim={isDim} />}
      </div>
    </div>
  )
}

function Floor({ label, specs, byNumber, onSelect, isDim }: {
  label: string
  specs: { code: string; count: number }[]
  byNumber: Map<string, any>
  onSelect: (id: string) => void
  isDim: (r: any) => boolean
}) {
  return (
    <div>
      <div className="eyebrow mb-3">{label}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specs.map(spec => (
          <BlockGrid key={spec.code} spec={spec} byNumber={byNumber} onSelect={onSelect} isDim={isDim} />
        ))}
      </div>
    </div>
  )
}

function BlockGrid({ spec, byNumber, onSelect, isDim }: {
  spec: { code: string; count: number }
  byNumber: Map<string, any>
  onSelect: (id: string) => void
  isDim: (r: any) => boolean
}) {
  const cols = Math.min(spec.count, 12)
  const rows = Math.ceil(spec.count / cols)
  const svgW = cols * (ROOM_W + ROOM_GAP) + 10
  const svgH = rows * (ROOM_H + ROOM_GAP) + 30

  return (
    <div className="bezel p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="font-mono tabular text-[14px] font-semibold text-espresso">Block {spec.code}</h4>
        <span className="text-[11px] text-espresso-muted tabular">{spec.count} rooms</span>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
        {Array.from({ length: spec.count }).map((_, i) => {
          const roomNumber = `${spec.code}-${i + 1}`
          const room = byNumber.get(roomNumber)
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = 5 + col * (ROOM_W + ROOM_GAP)
          const y = 5 + row * (ROOM_H + ROOM_GAP)
          if (!room) {
            return <rect key={roomNumber} x={x} y={y} width={ROOM_W} height={ROOM_H} rx={2.5} fill="#F4EFE7" stroke="#E8DFD1" strokeWidth={0.5} />
          }
          return (
            <RoomCell
              key={roomNumber}
              room={room}
              x={x} y={y} w={ROOM_W} h={ROOM_H}
              dim={isDim(room)}
              onClick={() => onSelect(room.id)}
            />
          )
        })}
      </svg>
    </div>
  )
}
