'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, formatPct, MONTHS } from '@/lib/utils'

interface Props { campId: string }

export function CampAnalyticsTab({ campId }: Props) {
  // Pivot shape: [{ category, size, month, year, rent, people, pct_rent, pct_people }]
  const { data } = useQuery({
    queryKey: ['camp-pivot', campId],
    queryFn: () => endpoints.reportOccupancy(campId),
  })
  const pivot: any[] = data?.pivot ?? []

  // Build matrix
  const categories = ['BGC', 'Monthly', 'Yearly', 'Ejari', 'Vacant']
  const sizes = ['Big', 'Small', 'Service']
  const months = Array.from(new Set(pivot.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`))).sort()

  return (
    <div className="space-y-6">
      <div className="bezel p-6">
        <div className="eyebrow mb-1.5">Advanced</div>
        <h3 className="display-sm mb-5">Category × Size × Period</h3>

        {pivot.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-espresso-muted">
            No pivot data available. Populate monthly_records to build the matrix.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)]">
                  <th className="text-left py-2 pr-4 font-medium text-espresso-muted eyebrow">Category</th>
                  <th className="text-left py-2 pr-4 font-medium text-espresso-muted eyebrow">Size</th>
                  {months.map(m => (
                    <th key={m} className="text-right py-2 px-3 font-medium text-espresso-muted eyebrow tabular">
                      {m.split('-').reverse().join(' ').replace(/(\d{2}) (\d{4})/, (_, mm, yy) => `${MONTHS[parseInt(mm) - 1]?.slice(0, 3)} ${yy.slice(2)}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.flatMap(cat => sizes.map(size => {
                  const rowData = months.map(m => {
                    const [yy, mm] = m.split('-')
                    const r = pivot.find(x => x.category === cat && x.size === size && x.year === parseInt(yy) && x.month === parseInt(mm))
                    return r
                  })
                  return (
                    <tr key={`${cat}-${size}`} className="border-b border-[color:var(--color-border-subtle)] hover:bg-sand-50">
                      <td className="py-2 pr-4 text-[12px] font-medium text-espresso">{cat}</td>
                      <td className="py-2 pr-4 text-[12px] text-espresso-muted">{size}</td>
                      {rowData.map((r, i) => (
                        <td key={i} className="py-2 px-3 text-right font-mono tabular">
                          {r ? (
                            <div>
                              <div className="text-[12px] text-espresso">{formatAED(r.rent)}</div>
                              <div className="text-[10px] text-espresso-subtle mt-0.5">{r.people} ppl · {formatPct(r.pct_rent)}</div>
                            </div>
                          ) : <span className="text-espresso-subtle">—</span>}
                        </td>
                      ))}
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
