'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAEDShort, formatPct, cn } from '@/lib/utils'
import { MapTrifold, ArrowRight, Bed } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bezel-deep group overflow-hidden"
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
            <div className="eyebrow mb-3">Room grid</div>
            <div className="grid gap-0.5 md:gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
              {rooms?.data?.slice(0, camp.total_rooms).map((r: any) => (
                <HeatCell key={r.id} state={stateFromRoom(r)} />
              )) || Array.from({ length: camp.total_rooms }).map((_, i) => <div key={i} className="aspect-square rounded-[2px] bg-sand-200" />)}
            </div>
            <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-espresso-subtle">
              <Legend color="bg-teal"      label="Occupied" />
              <Legend color="bg-sand-300"  label="Vacant" />
              <Legend color="bg-amber-400" label="Bartawi" />
              <Legend color="bg-rust"      label="Overdue" />
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

function HeatCell({ state }: { state: string }) {
  const colors: Record<string, string> = {
    occupied: 'bg-teal/80',
    vacant:   'bg-sand-300',
    bartawi:  'bg-amber-400',
    overdue:  'bg-rust',
    vacating: 'bg-ochre',
  }
  return <div className={cn('aspect-square rounded-[2px]', colors[state] || 'bg-sand-200')} />
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-[1px] ${color}`} />
      <span>{label}</span>
    </div>
  )
}
