'use client'
import { Stack, Buildings } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import type { RoomStatusFilter } from './CampMapView'

interface Props {
  floor: 'ground' | 'first' | 'both'
  filter: RoomStatusFilter
  onFloor: (f: 'ground' | 'first' | 'both') => void
  onFilter: (f: RoomStatusFilter) => void
}

const FILTERS: { value: RoomStatusFilter; label: string }[] = [
  { value: 'all',           label: 'All' },
  { value: 'occupied',      label: 'Occupied' },
  { value: 'vacant',        label: 'Vacant' },
  { value: 'vacating',      label: 'Vacating' },
  { value: 'overdue',       label: 'Overdue' },
  { value: 'legal_dispute', label: 'Legal' },
  { value: 'bartawi_use',   label: 'Bartawi' },
]

export function MapControls({ floor, filter, onFloor, onFilter }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex p-1 rounded-lg bg-sand-100 text-[11px] font-body font-medium">
        {(['both', 'ground', 'first'] as const).map(f => (
          <button key={f} onClick={() => onFloor(f)}
            className={cn('px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 capitalize',
              floor === f ? 'bg-white text-espresso shadow-raise-1' : 'text-espresso-muted hover:text-espresso')}>
            <Icon icon={f === 'both' ? Stack : Buildings} size={11} />
            {f}
          </button>
        ))}
      </div>

      <div className="flex p-1 rounded-lg bg-sand-100 text-[11px] font-body font-medium flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => onFilter(f.value)}
            className={cn('px-3 py-1.5 rounded-md transition-all',
              filter === f.value ? 'bg-white text-espresso shadow-raise-1' : 'text-espresso-muted hover:text-espresso')}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
