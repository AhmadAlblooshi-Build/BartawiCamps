'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAEDShort, formatPct, cn } from '@/lib/utils'
import { MapTrifold, ArrowRight, Bed } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { cardHover, staggerItem } from '@/lib/motion'

interface Props { camp: any; month: number; year: number; delay?: number }

export function CampCard({ camp, month, year, delay = 0 }: Props) {
  const { data: summary } = useQuery({
    queryKey: ['camp-summary', camp.id, month, year],
    queryFn: () => endpoints.reportSummary(camp.id, month, year),
  })
  const { data: rooms } = useQuery({
    queryKey: ['camp-rooms-mini', camp.id],
    queryFn: () => endpoints.rooms({ camp_id: camp.id, limit: 500 }),
  })

  // Calculate occupancy for mini-heatmap (6×2 grid by block)
  const blocks = camp?.blocks ?? []
  const blockOccupancy: number[] = blocks.map((block: any) => {
    const blockRooms = rooms?.data?.filter((r: any) => r.block_id === block.id) ?? []
    const occupied = blockRooms.filter((r: any) => r.status === 'occupied').length
    const total = blockRooms.length
    return total > 0 ? (occupied / total) * 100 : 0
  })

  const collectionRate = summary?.financials?.collection_rate ?? 0

  return (
    <motion.div
      variants={staggerItem}
      whileHover="hover"
      whileTap="tap"
      initial="rest"
      animate="rest"
      className="bezel-deep group overflow-hidden cursor-pointer"
      style={{
        boxShadow: cardHover.rest.boxShadow,
      }}
    >
      <div className="bezel-inner">
        <Link href={`/camps/${camp.id}`}>
          <div className="p-6 pb-4 border-b border-[color:var(--color-border-subtle)]">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="eyebrow mb-2">{camp.code === 'C1' ? 'Camp One' : 'Camp Two'}</div>
                <h2 className="display-md">{camp.name}</h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-espresso text-sand-50 grid place-items-center font-display italic text-2xl shrink-0">
                {camp.code.slice(-1)}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-espresso-muted tabular">
              <div><span className="font-mono text-espresso font-semibold">{camp.total_rooms}</span> rooms</div>
              <div className="w-px h-3 bg-espresso-subtle/20" />
              <div><span className="font-mono text-espresso">{camp.leasable_rooms}</span> leasable</div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border-subtle)]">
            <Stat label="Occupancy"   value={formatPct(summary?.occupancy?.occupancy_rate)} />
            <Stat label="Collection"  value={formatPct(summary?.financials?.collection_rate)} />
            <Stat label="Outstanding" value={formatAEDShort(summary?.financials?.total_balance)} tone={summary?.financials?.total_balance > 0 ? 'rust' : 'neutral'} />
          </div>

          <div className="p-6 pt-5 border-t border-[color:var(--color-border-subtle)]">
            <div className="eyebrow mb-3">Occupancy by block</div>
            {/* Mini-heatmap: 6×2 grid showing occupancy by block */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {blockOccupancy.slice(0, 12).map((rate: number, i: number) => (
                <MiniHeatCell key={i} occupancyRate={rate} />
              ))}
              {/* Fill remaining cells if fewer than 12 blocks */}
              {blockOccupancy.length < 12 && Array.from({ length: 12 - blockOccupancy.length }).map((_: unknown, i: number) => (
                <div key={`empty-${i}`} className="aspect-square rounded bg-sand-200" />
              ))}
            </div>

            {/* Stats row with JetBrains Mono numbers */}
            <div className="flex items-center gap-1 text-[11px] text-espresso-muted mb-3">
              <span className="font-mono font-semibold text-espresso">{camp.total_rooms}</span>
              <span>rooms</span>
              <span className="mx-1">·</span>
              <span className="font-mono font-semibold text-espresso">{summary?.occupancy?.total_occupied ?? 0}</span>
              <span>occupied</span>
              <span className="mx-1">·</span>
              <span className="font-mono font-semibold text-espresso">{formatPct(summary?.occupancy?.occupancy_rate)}</span>
              <span>occupancy</span>
            </div>

            {/* Collection rate progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-espresso-muted">Collection rate</span>
                <span className="font-mono text-[11px] font-semibold text-espresso">{formatPct(collectionRate)}</span>
              </div>
              <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${collectionRate}%` }}
                  transition={{ duration: 0.8, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>

          <div className="p-5 bg-sand-50 flex items-center gap-2 border-t border-[color:var(--color-border-subtle)]">
            <div className="flex-1 flex items-center gap-3">
              <div className="group/cta flex items-center gap-1.5 text-[12px] font-medium text-espresso group-hover:text-amber-600 transition-colors">
                <Icon icon={MapTrifold} size={13} />
                View map
                <span className="group-hover/cta:translate-x-0.5 transition-transform">
                  <Icon icon={ArrowRight} size={11} />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-espresso-muted">
              <Icon icon={Bed} size={13} />
              Rooms
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  )
}

function stateFromRoom(r: any): string {
  if (r.has_overdue_balance) return 'overdue'
  if (r.status === 'bartawi_use' || r.property_type?.slug === 'bartawi-staff') return 'bartawi'
  if (r.status === 'vacating') return 'vacating'
  if (r.status === 'vacant')   return 'vacant'
  if (r.status === 'occupied') return 'occupied'
  return 'vacant'
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value?: string; tone?: 'neutral' | 'rust' }) {
  return (
    <div className="px-5 py-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className={cn('font-mono tabular text-[20px] font-semibold', tone === 'rust' ? 'text-rust' : 'text-espresso')}>
        {value || '—'}
      </div>
    </div>
  )
}

// Mini-heatmap cell: color intensity based on occupancy
function MiniHeatCell({ occupancyRate }: { occupancyRate: number }) {
  let bgColor = 'bg-sand-200' // 0%
  if (occupancyRate > 95) {
    bgColor = 'bg-teal' // >95%
  } else if (occupancyRate >= 80) {
    bgColor = 'bg-teal-pale' // 80-95%
  } else if (occupancyRate > 0) {
    bgColor = 'bg-amber-pale' // <80%
  }

  return (
    <div
      className={cn('aspect-square rounded transition-colors duration-300', bgColor)}
      title={`${occupancyRate.toFixed(0)}% occupied`}
    />
  )
}
