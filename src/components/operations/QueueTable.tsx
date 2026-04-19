'use client'

import { useRouter } from 'next/navigation'
import type { QueueKey } from './QueueTabs'
import type { OperationsRoom } from '@/lib/operations-data'
import { getPaymentStatus, STATUS_COLORS, STATUS_LABELS } from '@/lib/room-helpers'

interface Props {
  queue: QueueKey
  rooms: OperationsRoom[]
  selected: Set<string>
  onSelectionChange: (s: Set<string>) => void
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function rowKey(r: OperationsRoom): string {
  return `${r.campId}::${r.roomNumber}`
}

export function QueueTable({ queue, rooms, selected, onSelectionChange }: Props) {
  const router = useRouter()

  if (rooms.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#FFFFFF',
        border: '0.5px dashed #D6CFC5',
        borderRadius: '10px',
      }}>
        <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: '18px', color: '#6A6159', margin: 0 }}>
          {queue === 'outstanding' && 'No outstanding balances.'}
          {queue === 'expired' && 'No expired contracts.'}
          {queue === 'expiring' && 'No contracts expiring in the next 30 days.'}
          {queue === 'vacancies' && 'All rooms occupied.'}
        </p>
        <p style={{ fontSize: '12px', color: '#6A6159', marginTop: '8px', letterSpacing: '0.05em' }}>
          {queue === 'outstanding' && 'Every tenant has paid their current rent.'}
          {queue === 'expired' && 'All contracts are active or within valid terms.'}
          {queue === 'expiring' && 'No renewal actions needed right now.'}
          {queue === 'vacancies' && 'Both camps at full capacity.'}
        </p>
      </div>
    )
  }

  const allSelected = rooms.length > 0 && rooms.every(r => selected.has(rowKey(r)))

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected)
      rooms.forEach(r => next.delete(rowKey(r)))
      onSelectionChange(next)
    } else {
      const next = new Set(selected)
      rooms.forEach(r => next.add(rowKey(r)))
      onSelectionChange(next)
    }
  }

  const toggleOne = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectionChange(next)
  }

  const goToRoom = (r: OperationsRoom) => {
    router.push(`/camps/${r.campId}?tab=map&room=${r.roomNumber}`)
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '0.5px solid #D6CFC5',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{
              background: '#E8DFD3',
              borderBottom: '0.5px solid #D6CFC5',
            }}>
              <th style={thStyle(40)}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {queue === 'outstanding' && (
                <>
                  <th style={thStyle(80)}>Room</th>
                  <th style={thStyle(60)}>Camp</th>
                  <th style={thStyle(60)}>Block</th>
                  <th style={thStyle(0, 'left')}>Tenant</th>
                  <th style={thStyle(80)}>Contract</th>
                  <th style={thStyle(90, 'right')}>Rent</th>
                  <th style={thStyle(90, 'right')}>Paid</th>
                  <th style={thStyle(100, 'right')}>Balance</th>
                  <th style={thStyle(80)}>Source</th>
                  <th style={thStyle(80)}>Payment</th>
                  <th style={thStyle(0, 'left')}>Remarks</th>
                </>
              )}
              {queue === 'expired' && (
                <>
                  <th style={thStyle(80)}>Room</th>
                  <th style={thStyle(60)}>Camp</th>
                  <th style={thStyle(60)}>Block</th>
                  <th style={thStyle(0, 'left')}>Company</th>
                  <th style={thStyle(110)}>End Date</th>
                  <th style={thStyle(80, 'right')}>Days Ago</th>
                  <th style={thStyle(90, 'right')}>Rent</th>
                  <th style={thStyle(100, 'right')}>Balance</th>
                  <th style={thStyle(80)}>Flags</th>
                </>
              )}
              {queue === 'expiring' && (
                <>
                  <th style={thStyle(80)}>Room</th>
                  <th style={thStyle(60)}>Camp</th>
                  <th style={thStyle(60)}>Block</th>
                  <th style={thStyle(0, 'left')}>Company</th>
                  <th style={thStyle(110)}>End Date</th>
                  <th style={thStyle(80, 'right')}>Days Left</th>
                  <th style={thStyle(90, 'right')}>Rent</th>
                </>
              )}
              {queue === 'vacancies' && (
                <>
                  <th style={thStyle(80)}>Room</th>
                  <th style={thStyle(60)}>Camp</th>
                  <th style={thStyle(60)}>Block</th>
                  <th style={thStyle(80)}>Floor</th>
                  <th style={thStyle(0, 'left')}>Last Tenant</th>
                  <th style={thStyle(110)}>Property Type</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r, idx) => {
              const key = rowKey(r)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  style={{
                    borderBottom: '0.5px solid #E8DFD3',
                    background: isSelected ? 'rgba(168, 74, 59, 0.04)' : idx % 2 === 0 ? '#FFFFFF' : '#FAF7F2',
                    transition: 'background 0.12s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(30, 77, 82, 0.03)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAF7F2' }}
                >
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(key)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  {queue === 'outstanding' && (
                    <OutstandingRow r={r} onGo={() => goToRoom(r)} />
                  )}
                  {queue === 'expired' && (
                    <ExpiredRow r={r} onGo={() => goToRoom(r)} />
                  )}
                  {queue === 'expiring' && (
                    <ExpiringRow r={r} onGo={() => goToRoom(r)} />
                  )}
                  {queue === 'vacancies' && (
                    <VacantRow r={r} onGo={() => goToRoom(r)} />
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '10px 16px', fontSize: '11px', color: '#6A6159', background: '#FAF7F2', borderTop: '0.5px solid #E8DFD3' }}>
        {rooms.length} {rooms.length === 1 ? 'row' : 'rows'}
        {selected.size > 0 && ` · ${selected.size} selected`}
      </div>
    </div>
  )
}

function thStyle(width: number, align: 'left' | 'right' | 'center' = 'center') {
  return {
    padding: '10px 12px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#6A6159',
    textAlign: align as any,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    width: width === 0 ? 'auto' : `${width}px`,
    whiteSpace: 'nowrap' as const,
  }
}

const tdStyle = {
  padding: '10px 12px',
  verticalAlign: 'middle' as const,
}

function RoomLink({ room, onGo }: { room: string; onGo: () => void }) {
  return (
    <button
      onClick={onGo}
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        fontWeight: 600,
        color: '#1A1816',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(106, 97, 89, 0.3)',
        textUnderlineOffset: '3px',
      }}
    >
      {room}
    </button>
  )
}

function OutstandingRow({ r, onGo }: { r: any; onGo: () => void }) {
  return (
    <>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <RoomLink room={r.roomNumber} onGo={onGo} />
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>
        {r.campName.includes('2') ? 'C2' : 'C1'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>
        {r.blockCode}
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: '12px', color: '#1A1816' }}>{r.tenant}</span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px', color: '#6A6159', textTransform: 'capitalize' }}>
        {r.contractType || '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#1A1816' }}>
        {r.rent.toLocaleString()}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#1E4D52' }}>
        {r.paid.toLocaleString()}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#A84A3B' }}>
        {r.balance.toLocaleString()}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {r.isSynthesized ? (
          <span style={{ fontSize: '9px', padding: '3px 8px', background: '#E8DFD3', color: '#6A6159', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending
          </span>
        ) : (
          <span style={{ fontSize: '9px', padding: '3px 8px', background: 'rgba(168, 74, 59, 0.12)', color: '#A84A3B', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Confirmed
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {(() => {
          const status = getPaymentStatus(r)
          const color = STATUS_COLORS[status]
          const label = STATUS_LABELS[status]
          return (
            <span style={{
              fontSize: '9px',
              padding: '3px 8px',
              background: `${color}1F`,
              color: color,
              borderRadius: '999px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {label}
            </span>
          )
        })()}
      </td>
      <td style={tdStyle}>
        <span style={{ fontSize: '11px', color: '#6A6159', fontStyle: 'italic' }}>
          {r.hasLegalIssue && <span style={{ fontSize: '9px', padding: '2px 7px', background: 'rgba(26, 24, 22, 0.1)', color: '#1A1816', borderRadius: '999px', marginRight: '6px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontStyle: 'normal' }}>Legal</span>}
          {r.remarks || ''}
        </span>
      </td>
    </>
  )
}

function ExpiredRow({ r, onGo }: { r: any; onGo: () => void }) {
  const daysAgo = Math.abs(r.daysUntilExpiry || 0)
  return (
    <>
      <td style={{ ...tdStyle, textAlign: 'center' }}><RoomLink room={r.roomNumber} onGo={onGo} /></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.campName.includes('2') ? 'C2' : 'C1'}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.blockCode}</td>
      <td style={tdStyle}><span style={{ fontSize: '12px', color: '#1A1816' }}>{r.tenant}</span></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#8B6420' }}>
        {formatDate(r.contractEndDate)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: daysAgo > 90 ? '#A84A3B' : '#8B6420' }}>
        {daysAgo}d
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#1A1816' }}>
        {r.rent.toLocaleString()}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: r.balance > 0 ? '#A84A3B' : '#1E4D52', fontWeight: r.balance > 0 ? 600 : 400 }}>
        {r.balance.toLocaleString()}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {r.balance > 0 && (
            <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(168, 74, 59, 0.12)', color: '#A84A3B', borderRadius: '999px', fontWeight: 600 }}>DUE</span>
          )}
          {r.hasLegalIssue && (
            <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(26, 24, 22, 0.1)', color: '#1A1816', borderRadius: '999px', fontWeight: 600 }}>LEGAL</span>
          )}
        </div>
      </td>
    </>
  )
}

function ExpiringRow({ r, onGo }: { r: any; onGo: () => void }) {
  const daysLeft = r.daysUntilExpiry || 0
  return (
    <>
      <td style={{ ...tdStyle, textAlign: 'center' }}><RoomLink room={r.roomNumber} onGo={onGo} /></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.campName.includes('2') ? 'C2' : 'C1'}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.blockCode}</td>
      <td style={tdStyle}><span style={{ fontSize: '12px', color: '#1A1816' }}>{r.tenant}</span></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#B8883D' }}>{formatDate(r.contractEndDate)}</td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: daysLeft < 7 ? '#A84A3B' : '#B8883D' }}>
        {daysLeft}d
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#1A1816' }}>
        {r.rent.toLocaleString()}
      </td>
    </>
  )
}

function VacantRow({ r, onGo }: { r: any; onGo: () => void }) {
  return (
    <>
      <td style={{ ...tdStyle, textAlign: 'center' }}><RoomLink room={r.roomNumber} onGo={onGo} /></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.campName.includes('2') ? 'C2' : 'C1'}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A6159' }}>{r.blockCode}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px', color: '#6A6159' }}>{r.floor || '—'}</td>
      <td style={tdStyle}><span style={{ fontSize: '12px', color: '#6A6159', fontStyle: 'italic' }}>{r.tenant || '—'}</span></td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '11px', color: '#6A6159', textTransform: 'capitalize' }}>
        {r.propertyType || '—'}
      </td>
    </>
  )
}
