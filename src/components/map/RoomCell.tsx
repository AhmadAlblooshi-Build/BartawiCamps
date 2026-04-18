'use client'
import { formatAED } from '@/lib/utils'
import * as Tooltip from '@radix-ui/react-tooltip'

interface Props {
  room: any
  x: number
  y: number
  w: number
  h: number
  label?: string
  dim?: boolean
  onClick: () => void
}

export function RoomCell({ room, x, y, w, h, label, dim = false, onClick }: Props) {
  const { fill, stroke, strokeDasharray, labelColor } = colorForRoom(room)
  const displayLabel = label ?? compactLabel(room.room_number)

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <g
          className="cursor-pointer group transition-all duration-200 ease-out"
          onClick={onClick}
          opacity={dim ? 0.25 : 1}
          tabIndex={0}
          role="button"
          aria-label={`Room ${room.room_number}`}
        >
          <rect
            x={x} y={y} width={w} height={h} rx={2.5}
            fill={fill}
            stroke={stroke}
            strokeWidth={0.8}
            strokeDasharray={strokeDasharray}
            className="transition-all duration-200 group-hover:stroke-amber group-hover:stroke-[1.8] group-focus:stroke-amber group-focus:stroke-[1.8]"
          />
          <text
            x={x + w / 2}
            y={y + h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={labelColor}
            fontSize={Math.min(w, h) * 0.32}
            fontFamily="var(--font-mono)"
            fontWeight={500}
            className="pointer-events-none tabular"
          >
            {displayLabel}
          </text>
        </g>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="bezel bg-sand-50 text-espresso rounded-lg px-3 py-2 text-[11px] font-body shadow-raise-3 z-50 max-w-[200px]"
        >
          <div className="font-mono tabular font-semibold mb-1 text-[12px]">
            Room {room.room_number}
          </div>
          <div className="text-espresso-muted mb-0.5">
            {room.current_occupancy?.individual?.owner_name
              || room.current_occupancy?.company?.name
              || 'Vacant'}
          </div>
          {room.standard_rent > 0 && (
            <div className="text-espresso-muted font-mono tabular text-[10px] mt-1">
              {formatAED(Number(room.standard_rent))}/mo
            </div>
          )}
          <Tooltip.Arrow fill="var(--color-sand-200)" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// Show only the room number portion, not the full "A-12" (since Block is implied)
function compactLabel(roomNumber: string): string {
  // e.g. "A-12" → "12", "AA-5" → "5", "C1-102" → "102"
  const parts = roomNumber.split('-')
  return parts[parts.length - 1]
}

function colorForRoom(room: any): { fill: string; stroke: string; strokeDasharray?: string; labelColor: string } {
  const status = resolveStatus(room)
  const map: Record<string, { fill: string; stroke: string; strokeDasharray?: string; labelColor: string }> = {
    // Occupied: teal-pale fill, teal border
    occupied:      { fill: '#D8E3E4', stroke: '#1E4D52', labelColor: '#1E4D52' },
    // Vacant: sand-50 fill, amber dashed border
    vacant:        { fill: '#FAF7F2', stroke: '#B8883D', strokeDasharray: '3,3', labelColor: '#6A6159' },
    // Vacating: ochre-pale fill, ochre border
    vacating:      { fill: '#F4E5C1', stroke: '#C48A1E', labelColor: '#5F4F2C' },
    // Bartawi use: sand-200 fill, sand-300 border
    bartawi_use:   { fill: '#E8DFD3', stroke: '#D6CFC5', labelColor: '#6A6159' },
    // Overdue/maintenance: rust-pale fill, rust border
    overdue:       { fill: '#F0DDD9', stroke: '#A84A3B', labelColor: '#A84A3B' },
    maintenance:   { fill: '#F0DDD9', stroke: '#A84A3B', labelColor: '#A84A3B' },
    // Legal dispute: plum colors
    legal_dispute: { fill: '#EAE3F3', stroke: '#5A3E8A', labelColor: '#5A3E8A' },
    // Service/utility
    service:       { fill: '#E8DFD1', stroke: '#8A7558', labelColor: '#5E4D37' },
  }
  return map[status] || map.vacant
}

function resolveStatus(room: any): string {
  if (room.property_type?.slug === 'service-utility' || room.room_type === 'service') return 'service'
  if (room.status === 'bartawi_use') return 'bartawi_use'
  if (room.status === 'maintenance') return 'maintenance'
  if (room.status === 'vacating')    return 'vacating'
  if (room.status === 'vacant')      return 'vacant'
  const contractStatus = room.current_occupancy?.contract?.status
  if (contractStatus === 'legal_dispute') return 'legal_dispute'
  if (room.has_overdue_balance)           return 'overdue'
  return 'occupied'
}
