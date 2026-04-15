'use client'
import { cn } from '@/lib/utils'
import type { Camp } from '@/lib/types'

interface Props {
  camps: Camp[]
  activeCampId: string
  onChange: (campId: string) => void
}

export function CampTabs({ camps, activeCampId, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-bg-elevated border border-border rounded-xl p-1">
      {camps.map((camp) => (
        <button
          key={camp.id}
          onClick={() => onChange(camp.id)}
          className={cn(
            'flex-1 px-6 py-2.5 rounded-lg font-body font-medium text-sm transition-all duration-150',
            activeCampId === camp.id
              ? 'bg-bg-card border border-border text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          {camp.name}
          <span className={cn(
            'ml-2 text-xs',
            activeCampId === camp.id ? 'text-accent-cyan' : 'text-text-dim'
          )}>
            {camp.total_rooms} rooms
          </span>
        </button>
      ))}
    </div>
  )
}
