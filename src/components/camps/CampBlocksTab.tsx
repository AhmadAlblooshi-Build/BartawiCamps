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
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {blocks.map((b: any, index: number) => {
        const occupancyRate = b.room_count > 0 ? ((b.occupied_count ?? 0) / b.room_count) * 100 : 0

        return (
          <motion.div
            key={b.id}
            className="bezel p-6"
            variants={staggerItem}
            transition={{ delay: index * 0.04 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="eyebrow mb-1">{b.floor_label}</div>
                <h4 className="display-sm">{b.code}</h4>
              </div>
              <div className="text-right">
                <div className="data-lg">{b.room_count}</div>
                <div className="overline">rooms</div>
              </div>
            </div>

            {/* Occupancy progress bar - 6px height */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="overline">Occupancy</span>
                <span className="data-md">
                  {occupancyRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-[6px] bg-sand-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyRate}%` }}
                  transition={{ duration: 0.8, delay: index * 0.04 + 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-[color:var(--color-border-subtle)]">
              <div>
                <div className="data-md text-teal">{b.occupied_count ?? 0}</div>
                <div className="overline mt-1">Occupied</div>
              </div>
              <div>
                <div className="data-md text-espresso-muted">{b.vacant_count ?? 0}</div>
                <div className="overline mt-1">Vacant</div>
              </div>
              <div>
                <div className="data-md text-rust">{formatAED(b.outstanding ?? 0)}</div>
                <div className="overline mt-1">Outstanding</div>
              </div>
            </div>

            {/* List vacant rooms if < 5 vacant */}
            {(b.vacant_count ?? 0) > 0 && (b.vacant_count ?? 0) < 5 && b.vacant_rooms && (
              <div className="mt-4 pt-4 border-t border-[color:var(--color-border-subtle)]">
                <div className="overline mb-2">Vacant rooms</div>
                <div className="flex flex-wrap gap-1.5">
                  {b.vacant_rooms.map((room: any) => (
                    <span
                      key={room.id}
                      className="inline-flex items-center px-2 py-1 rounded bg-sand-100 text-[11px] font-mono text-espresso"
                    >
                      {room.number}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}
