'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED } from '@/lib/utils'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

interface Props { campId: string; month: number; year: number }

export function CampBlocksTab({ campId, month, year }: Props) {
  const { data: camp } = useQuery({ queryKey: ['camp', campId], queryFn: () => endpoints.camp(campId) })
  const blocks = camp?.blocks ?? []

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {blocks.map((b: any) => {
        const occupancyRate = b.room_count > 0 ? ((b.occupied_count ?? 0) / b.room_count) * 100 : 0

        return (
          <motion.div key={b.id} className="bezel p-5" variants={staggerItem}>
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

            {/* Occupancy progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-espresso-muted">Occupancy</span>
                <span className="font-mono text-[11px] font-semibold text-espresso">
                  {occupancyRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyRate}%` }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
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
          </motion.div>
        )
      })}
    </motion.div>
  )
}
