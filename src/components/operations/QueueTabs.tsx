'use client'

import type { OperationsSummary } from '@/lib/operations-data'

export type QueueKey = 'outstanding' | 'expired' | 'expiring' | 'vacancies'

interface Props {
  activeQueue: QueueKey
  onChange: (q: QueueKey) => void
  summary: OperationsSummary
}

const QUEUES: Array<{ key: QueueKey; label: string; getCount: (s: OperationsSummary) => number; color: string }> = [
  { key: 'outstanding', label: 'Outstanding', getCount: s => s.outstandingCount, color: '#A84A3B' },
  { key: 'expired', label: 'Expired', getCount: s => s.expiredCount, color: '#8B6420' },
  { key: 'expiring', label: 'Expiring Soon', getCount: s => s.expiringCount, color: '#B8883D' },
  { key: 'vacancies', label: 'Vacancies', getCount: s => s.vacantCount, color: '#1E4D52' },
]

export function QueueTabs({ activeQueue, onChange, summary }: Props) {
  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '0.5px solid #D6CFC5' }}>
      {QUEUES.map(q => {
        const isActive = activeQueue === q.key
        const count = q.getCount(summary)
        return (
          <button
            key={q.key}
            onClick={() => onChange(q.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${q.color}` : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-0.5px',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#1A1816' : '#6A6159',
              letterSpacing: '0.02em',
            }}>
              {q.label}
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '999px',
              background: isActive ? q.color : '#E8DFD3',
              color: isActive ? '#FAF7F2' : '#6A6159',
            }}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
