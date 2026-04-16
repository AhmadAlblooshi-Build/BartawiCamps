'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, formatPct, cn } from '@/lib/utils'

interface Props { campId: string; month: number; year: number }

export function CampOverviewTab({ campId, month, year }: Props) {
  const { data: summary } = useQuery({
    queryKey: ['camp-summary', campId, month, year],
    queryFn: () => endpoints.reportSummary(campId, month, year),
  })
  const { data: occupancy } = useQuery({
    queryKey: ['camp-occupancy', campId],
    queryFn: () => endpoints.reportOccupancy(campId),
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI label="Total rooms"  value={summary?.occupancy?.total_rooms ?? '—'} />
        <KPI label="Leasable"     value={summary?.occupancy?.leasable_rooms ?? '—'} />
        <KPI label="Occupied"     value={summary?.occupancy?.occupied ?? '—'} tone="teal" />
        <KPI label="Occupancy %"  value={formatPct(summary?.occupancy?.occupancy_rate)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="Monthly rent"  value={formatAED(summary?.financials?.total_rent)} />
        <KPI label="Collected"     value={formatAED(summary?.financials?.total_paid)} tone="teal" />
        <KPI label="Outstanding"   value={formatAED(summary?.financials?.total_balance)} tone={summary?.financials?.total_balance > 0 ? 'rust' : 'neutral'} />
      </div>

      <div className="bezel p-6">
        <div className="eyebrow mb-1.5">Breakdown</div>
        <h3 className="display-sm mb-5">By property type</h3>
        {occupancy?.by_property_type ? (
          <div className="space-y-2">
            {occupancy.by_property_type.map((row: any) => (
              <div key={row.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-sand-100 transition-colors">
                <div className="w-40 text-[13px] font-medium text-espresso">{row.name}</div>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-sand-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ width: `${(row.count / (occupancy.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="font-mono tabular text-[12px] text-espresso-muted w-24 text-right">
                  {row.count} · {formatPct((row.count / (occupancy.total || 1)) * 100)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-espresso-muted">Loading breakdown…</div>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, tone = 'neutral' }: { label: string; value: any; tone?: 'neutral' | 'teal' | 'rust' }) {
  const toneColors = { neutral: 'text-espresso', teal: 'text-teal', rust: 'text-rust' }
  return (
    <div className="bezel p-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className={cn('font-mono tabular text-[22px] font-semibold', toneColors[tone])}>{value}</div>
    </div>
  )
}
