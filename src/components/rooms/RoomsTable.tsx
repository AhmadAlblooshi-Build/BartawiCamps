'use client'
import { useState } from 'react'
import { formatAEDShort, getTenantName, getStatusBg, getStatusLabel } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import type { Room } from '@/lib/types'

interface Props {
  rooms: Room[]
  loading?: boolean
  onRoomClick: (room: Room) => void
}

export function RoomsTable({ rooms, loading, onRoomClick }: Props) {
  if (loading) return <TableSkeleton rows={12} />

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated/50">
            {['SR#','Room','Block','Tenant / Company','People','Rent (AED)','Status'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-text-muted font-body font-medium text-xs uppercase tracking-wider whitespace-nowrap first:pl-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {rooms.map((room) => {
            const tenantName = room.current_occupancy?.individual?.owner_name
              || room.current_occupancy?.company?.name
              || '—'
            const monthRecord = room.monthly_records?.[0]

            return (
              <tr
                key={room.id}
                onClick={() => onRoomClick(room)}
                className="hover:bg-bg-elevated/40 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3 pl-5">
                  <span className="font-mono text-text-dim text-xs">{room.sr_number || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-text-primary text-sm">
                    {room.room_number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-muted text-xs">{room.block?.code || '—'}</span>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-text-secondary truncate block">{tenantName}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text-muted text-xs number-cell">
                    {room.current_occupancy?.people_count || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="number-cell text-text-secondary">
                    {room.current_occupancy?.monthly_rent
                      ? formatAEDShort(room.current_occupancy.monthly_rent)
                      : '—'
                    }
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={room.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rooms.length === 0 && (
        <div className="py-12 text-center text-text-muted font-body text-sm">
          No rooms match your filters
        </div>
      )}
    </div>
  )
}
