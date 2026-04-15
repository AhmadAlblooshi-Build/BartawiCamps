'use client'
import { useState } from 'react'
import { useCamps } from '@/lib/queries'
import { recordsApi } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { formatAEDShort, formatDate, getTenantName, MONTHS, getCurrentMonthYear } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { CampTabs } from '@/components/dashboard/CampTabs'

export default function PaymentsPage() {
  const { month: cm, year: cy } = getCurrentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const { data: camps } = useCamps()
  const [activeCampId, setActiveCampId] = useState<string | null>(null)
  const effectiveCampId = activeCampId ?? camps?.[0]?.id

  const { data, isLoading } = useQuery({
    queryKey: ['records-for-payments', effectiveCampId, month, year],
    queryFn: () => recordsApi.list({ campId: effectiveCampId, month, year, limit: 200 }),
    enabled: !!effectiveCampId,
  })

  const records = data?.data ?? []
  const totalRent = records.reduce((s, r) => s + r.rent, 0)
  const totalPaid = records.reduce((s, r) => s + r.paid, 0)
  const totalBalance = records.reduce((s, r) => s + r.balance, 0)

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Payments</h1>
          <p className="text-text-muted text-sm mt-0.5">Monthly financial records</p>
        </div>
        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {camps && camps.length > 0 && (
        <CampTabs camps={camps} activeCampId={effectiveCampId ?? ''} onChange={setActiveCampId} />
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Rent', value: totalRent, color: 'text-text-primary' },
          { label: 'Collected', value: totalPaid, color: 'text-status-occupied' },
          { label: 'Outstanding', value: totalBalance, color: totalBalance > 0 ? 'text-status-vacant' : 'text-text-muted' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-text-muted text-xs uppercase font-body mb-2">{label}</p>
            <p className={`font-heading font-bold text-xl number-cell ${color}`}>
              AED {formatAEDShort(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary">
            {MONTHS[month - 1]} {year} — All Records
          </h2>
          <p className="text-text-muted text-xs mt-0.5">{records.length} records</p>
        </div>
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={10} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-elevated/30">
                  {['Room','Tenant','Type','Rent','Paid','Balance','Remarks'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-text-muted font-body font-medium text-xs uppercase tracking-wider first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-bg-elevated/30 transition-colors">
                    <td className="px-4 py-3 pl-5">
                      <span className="font-mono font-semibold text-text-primary text-xs">
                        {rec.room?.room_number || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      <span className="text-text-secondary">{getTenantName(rec)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {rec.contract_type ? <StatusBadge status={rec.contract_type} /> : <span className="text-text-dim">—</span>}
                    </td>
                    <td className="px-4 py-3 number-cell text-text-secondary">{formatAEDShort(rec.rent)}</td>
                    <td className="px-4 py-3 number-cell text-status-occupied">{formatAEDShort(rec.paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`number-cell font-semibold ${rec.balance > 0 ? 'text-status-vacant' : 'text-text-muted'}`}>
                        {formatAEDShort(rec.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <span className="text-text-muted text-xs truncate block">{rec.remarks || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
