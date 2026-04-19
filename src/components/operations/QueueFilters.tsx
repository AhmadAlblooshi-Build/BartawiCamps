'use client'

import type { QueueKey } from './QueueTabs'

export interface FilterState {
  camp: 'all' | 'camp1' | 'camp2'
  block: string            // 'all' or specific block code
  search: string
  amountMin: number | null
  amountMax: number | null
  showSynthesized: boolean
}

interface Props {
  queue: QueueKey
  filters: FilterState
  onChange: (f: FilterState) => void
  availableBlocks: string[]
}

const inputStyle = {
  padding: '8px 12px',
  fontSize: '12px',
  fontFamily: 'Geist, sans-serif',
  background: '#FFFFFF',
  border: '0.5px solid #D6CFC5',
  borderRadius: '6px',
  color: '#1A1816',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export function QueueFilters({ queue, filters, onChange, availableBlocks }: Props) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch })

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Camp toggle */}
      <div style={{ display: 'flex', background: '#FFFFFF', border: '0.5px solid #D6CFC5', borderRadius: '6px', overflow: 'hidden' }}>
        {(['all', 'camp1', 'camp2'] as const).map(c => (
          <button
            key={c}
            onClick={() => set({ camp: c })}
            style={{
              padding: '8px 14px',
              background: filters.camp === c ? '#1A1816' : 'transparent',
              color: filters.camp === c ? '#FAF7F2' : '#6A6159',
              border: 'none',
              fontSize: '11px',
              fontWeight: filters.camp === c ? 600 : 500,
              cursor: 'pointer',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {c === 'all' ? 'Both' : c === 'camp1' ? 'Camp 1' : 'Camp 2'}
          </button>
        ))}
      </div>

      {/* Block filter */}
      <select
        value={filters.block}
        onChange={e => set({ block: e.target.value })}
        style={{ ...inputStyle, minWidth: '110px', cursor: 'pointer' }}
      >
        <option value="all">All blocks</option>
        {availableBlocks.map(b => (
          <option key={b} value={b}>Block {b}</option>
        ))}
      </select>

      {/* Search */}
      <input
        type="text"
        placeholder="Search tenant, room, remarks…"
        value={filters.search}
        onChange={e => set({ search: e.target.value })}
        style={{ ...inputStyle, minWidth: '240px', flex: 1 }}
      />

      {/* Outstanding-specific filters */}
      {queue === 'outstanding' && (
        <>
          <input
            type="number"
            placeholder="Min AED"
            value={filters.amountMin ?? ''}
            onChange={e => set({ amountMin: e.target.value ? Number(e.target.value) : null })}
            style={{ ...inputStyle, width: '100px' }}
          />
          <input
            type="number"
            placeholder="Max AED"
            value={filters.amountMax ?? ''}
            onChange={e => set({ amountMax: e.target.value ? Number(e.target.value) : null })}
            style={{ ...inputStyle, width: '100px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6A6159', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.showSynthesized}
              onChange={e => set({ showSynthesized: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            Include pending entry
          </label>
        </>
      )}

      {/* Clear filters */}
      {(filters.camp !== 'all' || filters.block !== 'all' || filters.search || filters.amountMin !== null || filters.amountMax !== null) && (
        <button
          onClick={() => onChange({ camp: 'all', block: 'all', search: '', amountMin: null, amountMax: null, showSynthesized: true })}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: '0.5px solid #D6CFC5',
            borderRadius: '6px',
            color: '#6A6159',
            fontSize: '11px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
