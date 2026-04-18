'use client'
import { RoomCell } from './RoomCell'
import type { RoomStatusFilter } from './CampMapView'

interface Props {
  rooms: any[]
  floor: 'ground' | 'first' | 'both'
  filter: RoomStatusFilter
  onSelect: (roomId: string) => void
}

// Block layouts per actual PDF: (rows per column, number of columns = 2)
const BLOCK_SPECS_GROUND = [
  { code: 'A', rows: 11, cols: 2, hasExtras: false },
  { code: 'B', rows: 11, cols: 2, hasExtras: true  }, // B-23, B-24
  { code: 'C', rows: 11, cols: 2, hasExtras: false },
  { code: 'D', rows: 11, cols: 2, hasExtras: true  }, // D-23 only (actually 23 rooms)
  { code: 'E', rows: 11, cols: 2, hasExtras: true  }, // E-23, E-24, contains Mosque
  { code: 'F', rows: 11, cols: 2, hasExtras: false },
]
const BLOCK_SPECS_FIRST = [
  { code: 'AA', rows: 11, cols: 2, hasExtras: false },
  { code: 'BB', rows: 11, cols: 2, hasExtras: true  },
  { code: 'CC', rows: 11, cols: 2, hasExtras: false },
  { code: 'DD', rows: 11, cols: 2, hasExtras: true  },
  { code: 'EE', rows: 11, cols: 2, hasExtras: true  },
  { code: 'FF', rows: 11, cols: 2, hasExtras: false },
]

// Geometry
const BLOCK_WIDTH = 92
const BLOCK_GAP = 12
const ROOM_W = 40
const ROOM_H = 22
const ROOM_GAP = 2
const CENTRAL_GAP = 6 // gap between the two room columns (kitchen/dining strip)
const FRONT_STRIP_H = 42
const FLOOR_GAP = 80
const MARGIN = 30

export function CampMap1({ rooms, floor, filter, onSelect }: Props) {
  const showGround = floor === 'ground' || floor === 'both'
  const showFirst  = floor === 'first'  || floor === 'both'

  const byNumber = new Map<string, any>()
  rooms.forEach(r => byNumber.set(r.room_number, r))

  const blockHeight = 11 * (ROOM_H + ROOM_GAP) + 4
  const extraHeight = 2 * (ROOM_H + ROOM_GAP) // extra rooms at block ends
  const groundHeight = FRONT_STRIP_H + 10 + blockHeight + extraHeight
  const firstHeight  = blockHeight + extraHeight + 10

  const totalWidth = MARGIN * 2 + BLOCK_SPECS_GROUND.length * (BLOCK_WIDTH + BLOCK_GAP) - BLOCK_GAP
  const totalHeight = MARGIN * 2
    + (showGround ? groundHeight : 0)
    + (showGround && showFirst ? FLOOR_GAP : 0)
    + (showFirst ? firstHeight : 0)

  const isDim = (room: any): boolean => {
    if (filter === 'all' || !room) return false
    const tests: Record<string, (r: any) => boolean> = {
      occupied:      r => r.status === 'occupied',
      vacant:        r => r.status === 'vacant',
      vacating:      r => r.status === 'vacating',
      bartawi_use:   r => r.status === 'bartawi_use' || r.property_type?.slug === 'bartawi-staff',
      overdue:       r => r.has_overdue_balance === true,
      legal_dispute: r => r.current_occupancy?.contract?.status === 'legal_dispute',
      maintenance:   r => r.status === 'maintenance',
    }
    const pass = tests[filter]
    return pass ? !pass(room) : false
  }

  return (
    <div className="w-full overflow-auto">
      <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full h-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {/* SVG gradient definitions for room status fills */}
        <defs>
          <linearGradient id="grad-occupied" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30,77,82,0.12)" />
            <stop offset="100%" stopColor="rgba(30,77,82,0.08)" />
          </linearGradient>
          <linearGradient id="grad-vacating" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(196,138,30,0.1)" />
            <stop offset="100%" stopColor="rgba(196,138,30,0.06)" />
          </linearGradient>
          <linearGradient id="grad-maintenance" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168,74,59,0.1)" />
            <stop offset="100%" stopColor="rgba(168,74,59,0.06)" />
          </linearGradient>
        </defs>
        <rect width={totalWidth} height={totalHeight} fill="transparent" rx={10} />

        {showGround && (
          <g transform={`translate(${MARGIN}, ${MARGIN})`}>
            <FloorLabel y={-6} text="Ground Floor" />
            <FrontStrip width={totalWidth - MARGIN * 2} />
            <g transform={`translate(0, ${FRONT_STRIP_H + 10})`}>
              {BLOCK_SPECS_GROUND.map((spec, i) => (
                <Block
                  key={spec.code}
                  spec={spec}
                  byNumber={byNumber}
                  onSelect={onSelect}
                  isDim={isDim}
                  x={i * (BLOCK_WIDTH + BLOCK_GAP)}
                />
              ))}
            </g>
          </g>
        )}

        {showFirst && (
          <g transform={`translate(${MARGIN}, ${MARGIN + (showGround ? groundHeight + FLOOR_GAP : 0)})`}>
            <FloorLabel y={-6} text="First Floor" />
            {BLOCK_SPECS_FIRST.map((spec, i) => (
              <Block
                key={spec.code}
                spec={spec}
                byNumber={byNumber}
                onSelect={onSelect}
                isDim={isDim}
                x={i * (BLOCK_WIDTH + BLOCK_GAP)}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

function Block({ spec, byNumber, onSelect, isDim, x }: {
  spec: { code: string; rows: number; cols: number; hasExtras: boolean }
  byNumber: Map<string, any>
  onSelect: (id: string) => void
  isDim: (r: any) => boolean
  x: number
}) {
  // Rooms 1-11 on left column (from bottom up in the PDF, but we render top-down for sanity)
  // Rooms 12-22 on right column
  // Extras (23, 24) at top if hasExtras
  const rooms = []
  for (let i = 0; i < spec.rows; i++) {
    const leftNum = i + 1
    const rightNum = spec.rows * 2 - i // 22 → 12 going down right side
    rooms.push({ num: leftNum, col: 0, row: i })
    rooms.push({ num: rightNum, col: 1, row: i })
  }

  const centerX = BLOCK_WIDTH / 2
  const col0x = centerX - ROOM_W - CENTRAL_GAP / 2
  const col1x = centerX + CENTRAL_GAP / 2

  // Top extras — e.g., B-23, B-24 sit above the main block as a pair
  const extras: { num: number; x: number; y: number }[] = []
  if (spec.hasExtras) {
    const extraY = -(ROOM_H + ROOM_GAP) * 2 - 2
    extras.push({ num: 23, x: col0x, y: extraY + (ROOM_H + ROOM_GAP) })
    extras.push({ num: 24, x: col1x, y: extraY + (ROOM_H + ROOM_GAP) })
  }

  return (
    <g transform={`translate(${x}, ${spec.hasExtras ? 2 * (ROOM_H + ROOM_GAP) : 0})`}>
      {/* Block background */}
      <rect
        x={-2}
        y={-6}
        width={BLOCK_WIDTH + 4}
        height={spec.rows * (ROOM_H + ROOM_GAP) + 20}
        fill="#FFFFFF"
        stroke="rgba(26,24,22,0.06)"
        strokeWidth={0.8}
        rx={6}
      />

      {/* Block label — Fraunces italic per spec */}
      <text
        x={BLOCK_WIDTH / 2}
        y={spec.rows * (ROOM_H + ROOM_GAP) + 14}
        textAnchor="middle"
        fill="rgba(26,24,22,0.4)"
        fontSize={16}
        fontFamily="var(--font-display)"
        fontStyle="italic"
        fontWeight={500}
      >
        {spec.code}
      </text>

      {/* Central corridor strip — Kitchen/Dining with icon per spec */}
      <g opacity={0.4}>
        <rect
          x={centerX - CENTRAL_GAP / 2 - 1}
          y={spec.rows * (ROOM_H + ROOM_GAP) / 2 - 8}
          width={CENTRAL_GAP + 2}
          height={16}
          fill="rgba(232,223,211,0.5)"
          rx={2}
        />
        <text
          x={BLOCK_WIDTH / 2}
          y={spec.rows * (ROOM_H + ROOM_GAP) / 2 + 1}
          textAnchor="middle"
          fill="#6A6159"
          fontSize={6}
          fontFamily="var(--font-body)"
          className="pointer-events-none select-none eyebrow"
        >
          KITCHEN
        </text>
      </g>

      {/* Rooms */}
      {rooms.map(r => {
        const roomNumber = `${spec.code}-${r.num}`
        const room = byNumber.get(roomNumber)
        const rx = r.col === 0 ? col0x : col1x
        const ry = r.row * (ROOM_H + ROOM_GAP)
        if (!room) {
          // Placeholder (e.g., if data not seeded for this room)
          return (
            <rect key={roomNumber} x={rx} y={ry} width={ROOM_W} height={ROOM_H} rx={2.5}
              fill="#F4EFE7" stroke="#E8DFD1" strokeWidth={0.5} />
          )
        }
        return (
          <RoomCell
            key={roomNumber}
            room={room}
            x={rx} y={ry} w={ROOM_W} h={ROOM_H}
            dim={isDim(room)}
            onClick={() => onSelect(room.id)}
          />
        )
      })}

      {/* Extras (23, 24) */}
      {extras.map(ex => {
        const roomNumber = `${spec.code}-${ex.num}`
        const room = byNumber.get(roomNumber)
        if (!room) return null
        return (
          <RoomCell
            key={roomNumber}
            room={room}
            x={ex.x} y={ex.y - 2 * (ROOM_H + ROOM_GAP)} w={ROOM_W} h={ROOM_H}
            dim={isDim(room)}
            onClick={() => onSelect(room.id)}
          />
        )
      })}

      {/* Mosque marker in block E — with crescent icon per spec */}
      {spec.code === 'E' && (
        <g>
          <circle
            cx={BLOCK_WIDTH / 2}
            cy={4 * (ROOM_H + ROOM_GAP) + ROOM_H}
            r={18}
            fill="rgba(216,227,228,0.3)"
            stroke="rgba(30,77,82,0.3)"
            strokeWidth={0.8}
          />
          {/* Crescent moon icon (simple path) */}
          <path
            d={`M ${BLOCK_WIDTH / 2} ${4 * (ROOM_H + ROOM_GAP) + ROOM_H - 6} a 6 6 0 1 0 0 12 a 4 4 0 1 1 0 -12`}
            fill="rgba(30,77,82,0.6)"
          />
          <text
            x={BLOCK_WIDTH / 2}
            y={4 * (ROOM_H + ROOM_GAP) + ROOM_H + 26}
            textAnchor="middle"
            fill="rgba(30,77,82,0.5)"
            fontSize={7}
            fontWeight={600}
            fontFamily="var(--font-body)"
            className="eyebrow"
            style={{ letterSpacing: '0.12em' }}
          >
            MOSQUE
          </text>
        </g>
      )}
    </g>
  )
}

function FrontStrip({ width }: { width: number }) {
  const shops = [
    'Pharmacy', 'Gents Salon', 'Telex', 'Tayn Nuts', 'Kabul City', 'Shaklan',
    'Cafeteria', 'Fly Helal', 'Pump', 'Substation', 'AC Room'
  ]
  const shopW = width / shops.length
  return (
    <g>
      <rect x={0} y={0} width={width} height={FRONT_STRIP_H} rx={4}
        fill="rgba(232,223,211,0.3)" stroke="rgba(138,117,88,0.3)" strokeWidth={0.8} />
      {shops.map((name, i) => (
        <g key={name}>
          {i > 0 && <line x1={i * shopW} y1={4} x2={i * shopW} y2={FRONT_STRIP_H - 4} stroke="rgba(214,207,197,0.4)" strokeWidth={0.6} />}
          <text x={i * shopW + shopW / 2} y={FRONT_STRIP_H / 2} textAnchor="middle" dominantBaseline="central"
            fill="rgba(106,97,89,0.8)" fontSize={7} fontFamily="var(--font-body)">
            {name}
          </text>
        </g>
      ))}
      <text x={8} y={-4} fill="rgba(106,97,89,0.6)" fontSize={7} fontFamily="var(--font-body)"
        className="eyebrow"
        style={{ letterSpacing: '0.14em' }}>
        FRONT ENTRANCE · RETAIL
      </text>
    </g>
  )
}

function FloorLabel({ y, text }: { y: number; text: string }) {
  return (
    <text x={0} y={y} fill="#4A433C" fontSize={10} fontFamily="var(--font-body)" fontWeight={500}
      style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>
      {text}
    </text>
  )
}
