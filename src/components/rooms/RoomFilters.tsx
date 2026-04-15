'use client'
import { Search, X } from 'lucide-react'
import type { RoomFilters as Filters } from '@/lib/types'
import type { Block } from '@/lib/types'

interface Props {
  filters: Filters
  blocks: Block[]
  onChange: (f: Filters) => void
}

export function RoomFilterBar({ filters, blocks, onChange }: Props) {
  const set = (k: keyof Filters, v: any) => onChange({ ...filters, [k]: v || undefined })
  const clear = () => onChange({})
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          type="text"
          placeholder="Search room..."
          value={filters.search || ''}
          onChange={(e) => set('search', e.target.value)}
          className="pl-9 pr-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/50 w-48"
        />
      </div>

      {/* Block filter */}
      <select
        value={filters.blockCode || ''}
        onChange={(e) => set('blockCode', e.target.value)}
        className="px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-secondary focus:outline-none focus:border-accent-cyan/50"
      >
        <option value="">All Blocks</option>
        {blocks.map((b) => (
          <option key={b.id} value={b.code}>{b.code} — {b.floor_label}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => set('status', e.target.value)}
        className="px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-secondary focus:outline-none focus:border-accent-cyan/50"
      >
        <option value="">All Statuses</option>
        <option value="occupied">Occupied</option>
        <option value="vacant">Vacant</option>
        <option value="bartawi_use">Bartawi Use</option>
        <option value="maintenance">Maintenance</option>
      </select>

      {/* Balance toggle */}
      <button
        onClick={() => set('has_balance', !filters.has_balance)}
        className={`px-3 py-2 rounded-lg text-sm font-body transition-colors border ${
          filters.has_balance
            ? 'bg-status-vacant-dim border-status-vacant/30 text-status-vacant'
            : 'bg-bg-elevated border-border text-text-muted hover:text-text-secondary'
        }`}
      >
        Outstanding only
      </button>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-2 text-text-muted hover:text-text-secondary text-sm font-body transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  )
}
