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
  const { fill, stroke, strokeDasharray, labelColor, hoverGlow } = colorForRoom(room)
  const displayLabel = label ?? compactLabel(room.room_number)
  const status = resolveStatus(room)
  const statusClass = `room-${status === 'bartawi_use' ? 'bartawi' : status.replace('_', '-')}`

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <g
          className="cursor-pointer group transition-all duration-150 ease-spring"
          onClick={onClick}
          opacity={dim ? 0.6 : 1}
          tabIndex={0}
          role="button"
          aria-label={`Room ${room.room_number}`}
          style={{ transformOrigin: `${x + w/2}px ${y + h/2}px` }}
        >
          {/* Hover glow effect */}
          <rect
            x={x} y={y} width={w} height={h} rx={3}
            fill="none"
            stroke={hoverGlow}
            strokeWidth={10}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ filter: 'blur(10px)' }}
          />
          {/* Main cell with gradient fill */}
          <rect
            x={x} y={y} width={w} height={h} rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
            strokeDasharray={strokeDasharray}
            className={`${statusClass} transition-all duration-150 group-hover:stroke-[2] group-focus:stroke-[2]`}
            style={{
              transform: 'scale(1)',
              transition: 'all 150ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          />
          <text
            x={x + w / 2}
            y={y + h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={labelColor}
            fontSize={9}
            fontFamily="var(--font-mono)"
            fontWeight={500}
            className="pointer-events-none tabular"
          >
            {displayLabel}
          </text>
          <style>{`
            g:hover > rect:nth-child(2) {
              transform: scale(1.05);
            }
          `}</style>
        </g>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="elevation-float bg-sand-50 text-espresso rounded-xl px-3 py-2.5 text-[11px] font-body z-50 max-w-[200px]"
        >
          <div className="eyebrow mb-1">
            ROOM {room.room_number}
          </div>
          <div className="font-body text-espresso mb-0.5">
            {room.current_occupancy?.individual?.owner_name
              || room.current_occupancy?.company?.name
              || 'Vacant'}
          </div>
          <div className="overline" style={{ color: labelColor }}>
            {resolveStatus(room).toUpperCase().replace('_', ' ')}
          </div>
          {room.standard_rent > 0 && (
            <div className="text-espresso-muted font-mono tabular text-[10px] mt-1.5 pt-1.5 border-t border-sand-200">
              {formatAED(Number(room.standard_rent))}/mo
            </div>
          )}
          <Tooltip.Arrow fill="rgba(214,207,197,0.3)" />
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

function colorForRoom(room: any): { fill: string; stroke: string; strokeDasharray?: string; labelColor: string; hoverGlow: string } {
  const status = resolveStatus(room)
  const map: Record<string, { fill: string; stroke: string; strokeDasharray?: string; labelColor: string; hoverGlow: string }> = {
    // Occupied: gradient teal with glow-teal on hover
    occupied:      {
      fill: 'url(#grad-occupied)',
      stroke: 'rgba(30,77,82,0.4)',
      labelColor: '#1E4D52',
      hoverGlow: 'rgba(30,77,82,0.3)'
    },
    // Vacant: transparent with dashed amber border, glow-amber on hover
    vacant:        {
      fill: 'transparent',
      stroke: 'rgba(184,136,61,0.4)',
      strokeDasharray: '3,3',
      labelColor: '#6A6159',
      hoverGlow: 'rgba(184,136,61,0.3)'
    },
    // Vacating: gradient ochre
    vacating:      {
      fill: 'url(#grad-vacating)',
      stroke: 'rgba(196,138,30,0.4)',
      labelColor: '#5F4F2C',
      hoverGlow: 'rgba(196,138,30,0.3)'
    },
    // Bartawi use: sand colors at 50%
    bartawi_use:   {
      fill: 'rgba(232,223,211,0.5)',
      stroke: 'rgba(214,207,197,0.5)',
      labelColor: '#6A6159',
      hoverGlow: 'rgba(214,207,197,0.3)'
    },
    // Maintenance: gradient rust
    maintenance:   {
      fill: 'url(#grad-maintenance)',
      stroke: 'rgba(168,74,59,0.4)',
      labelColor: '#A84A3B',
      hoverGlow: 'rgba(168,74,59,0.3)'
    },
    // Overdue uses same as maintenance
    overdue:       {
      fill: 'url(#grad-maintenance)',
      stroke: 'rgba(168,74,59,0.4)',
      labelColor: '#A84A3B',
      hoverGlow: 'rgba(168,74,59,0.3)'
    },
    // Legal dispute: plum colors
    legal_dispute: {
      fill: '#EAE3F3',
      stroke: '#5A3E8A',
      labelColor: '#5A3E8A',
      hoverGlow: 'rgba(90,62,138,0.3)'
    },
    // Service/utility
    service:       {
      fill: '#E8DFD1',
      stroke: '#8A7558',
      labelColor: '#5E4D37',
      hoverGlow: 'rgba(138,117,88,0.3)'
    },
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
