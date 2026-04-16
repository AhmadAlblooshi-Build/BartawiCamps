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
  const { fill, stroke, labelColor } = colorForRoom(room)
  const displayLabel = label ?? compactLabel(room.room_number)

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <g
          className="cursor-pointer group transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
            strokeWidth={0.6}
            className="transition-all duration-200 group-hover:stroke-espresso group-hover:stroke-[1.2] group-focus:stroke-espresso"
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
        <Tooltip.Content side="top" sideOffset={6} className="bg-espresso text-sand-50 rounded-md px-2.5 py-1.5 text-[11px] font-body shadow-raise-3 z-50 animate-fade">
          <div className="font-mono tabular font-semibold mb-0.5">Room {room.room_number}</div>
          <div className="text-sand-300">
            {room.current_occupancy?.individual?.owner_name
              || room.current_occupancy?.company?.name
              || 'Vacant'}
          </div>
          {room.standard_rent > 0 && (
            <div className="text-sand-400 mt-1 font-mono tabular">{formatAED(Number(room.standard_rent))}/mo</div>
          )}
          <Tooltip.Arrow fill="#1A1816" />
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

function colorForRoom(room: any): { fill: string; stroke: string; labelColor: string } {
  const status = resolveStatus(room)
  const map: Record<string, { fill: string; stroke: string; labelColor: string }> = {
    occupied:      { fill: '#D8E3E4', stroke: '#1E4D52', labelColor: '#1E4D52' },
    vacant:        { fill: '#F4EFE7', stroke: '#B5A17E', labelColor: '#5E4D37' },
    vacating:      { fill: '#F4E5C1', stroke: '#C48A1E', labelColor: '#5F4F2C' },
    bartawi_use:   { fill: '#FBF5E8', stroke: '#B8883D', labelColor: '#785621' },
    overdue:       { fill: '#F1DDD6', stroke: '#A84A3B', labelColor: '#A84A3B' },
    legal_dispute: { fill: '#EAE3F3', stroke: '#5A3E8A', labelColor: '#5A3E8A' },
    maintenance:   { fill: '#F0E8D1', stroke: '#5F4F2C', labelColor: '#5F4F2C' },
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
