'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAEDShort, formatPct, cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { staggerItem } from '@/lib/motion'

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

  // Calculate occupancy for mini-heatmap (6 ground + 6 first floor blocks)
  const blocks = camp?.blocks ?? []
  const groundBlocks = blocks.filter((b: any) => b.floor === 0).slice(0, 6)
  const firstBlocks = blocks.filter((b: any) => b.floor === 1).slice(0, 6)

  const getBlockOccupancy = (block: any) => {
    const blockRooms = rooms?.data?.filter((r: any) => r.block_id === block.id) ?? []
    const occupied = blockRooms.filter((r: any) => r.status === 'occupied').length
    const total = blockRooms.length
    return total > 0 ? (occupied / total) * 100 : 0
  }

  const collectionRate = summary?.financials?.collection_rate ?? 0

  return (
    <motion.div
      variants={staggerItem}
      className="bezel elevation-hover"
    >
      <Link href={`/camps/${camp.id}`} className="block p-7">
        {/* Top section */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="display-md">{camp.name}</h2>
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber/10 text-amber">
              <span className="eyebrow">{camp.code}</span>
            </div>
          </div>
          <p className="body-sm text-espresso-muted">
            {camp.address || 'Bartawi Camp Location'}
          </p>
        </div>

        {/* Middle section - Heatmap */}
        <div className="mb-6">
          <div className="mb-3">
            <div className="eyebrow mb-2">Ground</div>
            <div className="grid grid-cols-6 gap-[3px]">
              {groundBlocks.map((block: any) => (
                <MiniBlockCell key={block.id} block={block} occupancyRate={getBlockOccupancy(block)} />
              ))}
              {Array.from({ length: 6 - groundBlocks.length }).map((_, i) => (
                <div key={`g-empty-${i}`} className="w-8 h-6 rounded bg-sand-200" />
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">First</div>
            <div className="grid grid-cols-6 gap-[3px]">
              {firstBlocks.map((block: any) => (
                <MiniBlockCell key={block.id} block={block} occupancyRate={getBlockOccupancy(block)} />
              ))}
              {Array.from({ length: 6 - firstBlocks.length }).map((_, i) => (
                <div key={`f-empty-${i}`} className="w-8 h-6 rounded bg-sand-200" />
              ))}
            </div>
          </div>
        </div>

        <div className="divider-warm" />

        {/* Bottom section - Stats */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5 text-[11px] text-espresso-muted mb-3">
            <span className="data-md">{camp.total_rooms}</span>
            <span className="overline">rooms</span>
            <span className="mx-1">·</span>
            <span className="data-md">{summary?.occupancy?.total_occupied ?? 0}</span>
            <span className="overline">occupied</span>
            <span className="mx-1">·</span>
            <span className="data-md">{formatPct(summary?.occupancy?.occupancy_rate)}</span>
          </div>

          {/* Collection progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow">Collection progress</span>
              <span className="eyebrow">{formatPct(collectionRate)}</span>
            </div>
            <div className="h-1 bg-sand-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-teal rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${collectionRate}%` }}
                transition={{ duration: 0.8, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// Mini-block cell: 32px × 24px with occupancy-based color
function MiniBlockCell({ block, occupancyRate }: { block: any; occupancyRate: number }) {
  let bgColor = 'bg-sand-200' // 0%
  let textColor = 'text-espresso'

  if (occupancyRate > 95) {
    bgColor = 'bg-teal' // >95%
    textColor = 'text-white'
  } else if (occupancyRate >= 80) {
    bgColor = 'bg-teal/60' // 80-95%
    textColor = 'text-white'
  } else if (occupancyRate >= 50) {
    bgColor = 'bg-amber/60' // 50-80%
    textColor = 'text-espresso'
  } else if (occupancyRate > 0) {
    bgColor = 'bg-rust/40' // <50%
    textColor = 'text-white'
  }

  return (
    <div
      className={cn('w-8 h-6 rounded flex items-center justify-center transition-colors duration-300', bgColor)}
      title={`${block.code}: ${occupancyRate.toFixed(0)}% occupied`}
    >
      <span className={cn('text-[9px] font-mono font-medium', textColor)}>
        {block.code}
      </span>
    </div>
  )
}
