import { formatAEDShort, getTenantName, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AlertTriangle } from 'lucide-react'
import type { MonthlyRecord } from '@/lib/types'

interface Props {
  records: MonthlyRecord[]
  onRoomClick?: (roomId: string) => void
}

export function OutstandingTable({ records, onRoomClick }: Props) {
  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-status-occupied-dim border border-status-occupied/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-status-occupied text-xl">✓</span>
          </div>
          <p className="font-body text-sm">No outstanding balances</p>
          <p className="font-body text-xs text-text-dim mt-1">All rooms are fully paid</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['Room','Tenant / Company','Contract','Rent (AED)','Paid (AED)','Balance (AED)','Remarks'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-text-muted font-body font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {records.map((rec) => (
            <tr
              key={rec.id}
              onClick={() => rec.room_id && onRoomClick?.(rec.room_id)}
              className="hover:bg-bg-elevated/50 transition-colors cursor-pointer group"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-text-primary font-medium text-xs">
                  {rec.room?.room_number || '—'}
                </span>
              </td>
              <td className="px-4 py-3 max-w-[200px] truncate">
                <span className="text-text-secondary font-body">{getTenantName(rec)}</span>
              </td>
              <td className="px-4 py-3">
                {rec.contract_type
                  ? <StatusBadge status={rec.contract_type} />
                  : <span className="text-text-dim">—</span>
                }
              </td>
              <td className="px-4 py-3 number-cell text-text-secondary">
                {formatAEDShort(rec.rent)}
              </td>
              <td className="px-4 py-3 number-cell text-text-secondary">
                {formatAEDShort(rec.paid)}
              </td>
              <td className="px-4 py-3">
                <span className={`number-cell font-semibold text-status-vacant`}>
                  {formatAEDShort(rec.balance)}
                </span>
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                {rec.remarks ? (
                  <div className="flex items-center gap-1.5">
                    {rec.remarks.toLowerCase().includes('legal') && (
                      <AlertTriangle className="w-3.5 h-3.5 text-status-legal flex-shrink-0" />
                    )}
                    <span className="text-text-muted text-xs truncate">{rec.remarks}</span>
                  </div>
                ) : (
                  <span className="text-text-dim">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
