'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED } from '@/lib/utils'

interface Props { campId: string; month: number; year: number }

export function CampBlocksTab({ campId, month, year }: Props) {
  const { data: camp } = useQuery({ queryKey: ['camp', campId], queryFn: () => endpoints.camp(campId) })
  const blocks = camp?.blocks ?? []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {blocks.map((b: any) => (
        <div key={b.id} className="bezel p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="eyebrow mb-1">{b.floor_label} · Block</div>
              <h4 className="display-sm font-mono">{b.code}</h4>
            </div>
            <div className="text-right">
              <div className="font-mono tabular text-[18px] text-espresso font-semibold">{b.room_count}</div>
              <div className="text-[10px] text-espresso-subtle">rooms</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-[color:var(--color-border-subtle)]">
            <div>
              <div className="font-mono tabular text-[13px] text-teal font-semibold">{b.occupied_count ?? 0}</div>
              <div className="text-[10px] text-espresso-subtle mt-0.5">Occupied</div>
            </div>
            <div>
              <div className="font-mono tabular text-[13px] text-sand-500 font-semibold">{b.vacant_count ?? 0}</div>
              <div className="text-[10px] text-espresso-subtle mt-0.5">Vacant</div>
            </div>
            <div>
              <div className="font-mono tabular text-[13px] text-rust font-semibold">{formatAED(b.outstanding ?? 0)}</div>
              <div className="text-[10px] text-espresso-subtle mt-0.5">Outstanding</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
