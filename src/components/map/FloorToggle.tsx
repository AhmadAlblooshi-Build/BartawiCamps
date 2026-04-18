'use client'
import { cn } from '@/lib/utils'

interface FloorToggleProps {
  floor: 'ground' | 'first'
  onChange: (floor: 'ground' | 'first') => void
}

export function FloorToggle({ floor, onChange }: FloorToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-sand-200/40 rounded-full">
      <button
        onClick={() => onChange('ground')}
        className={cn(
          'px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-200',
          floor === 'ground'
            ? 'bg-amber text-espresso shadow-sm'
            : 'text-espresso-muted hover:text-espresso'
        )}
      >
        Ground
      </button>
      <button
        onClick={() => onChange('first')}
        className={cn(
          'px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-200',
          floor === 'first'
            ? 'bg-amber text-espresso shadow-sm'
            : 'text-espresso-muted hover:text-espresso'
        )}
      >
        First Floor
      </button>
    </div>
  )
}
