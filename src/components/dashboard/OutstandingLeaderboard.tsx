'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, cn } from '@/lib/utils'
import { ArrowRight, Warning } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'
import Link from 'next/link'

interface Props { month: number; year: number }

export function OutstandingLeaderboard({ month, year }: Props) {
  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  const { data } = useQuery({
    queryKey: ['outstanding-leaderboard', month, year],
    queryFn: async () => {
      if (!camps?.data) return []
      const all = await Promise.all(camps.data.map((c: any) =>
        endpoints.reportOutstanding({ campId: c.id, month, year }).catch(() => ({ records: [] }))
      ))
      const merged: any[] = []
      all.forEach((r: any) => r?.records?.forEach((rec: any) => merged.push(rec)))

      const grouped = new Map<string, any>()
      merged.forEach(rec => {
        const key = rec.entity_group_name || rec.company_name || rec.owner_name || 'Unknown'
        const existing = grouped.get(key) || { name: key, balance: 0, rooms: new Set<string>() }
        existing.balance += Number(rec.balance || 0)
        existing.rooms.add(rec.room_number)
        grouped.set(key, existing)
      })
      return Array.from(grouped.values())
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 8)
        .map(g => ({ ...g, rooms: Array.from(g.rooms as Set<string>) }))
    },
    enabled: Boolean(camps?.data?.length),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.48, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="display-sm">Outstanding Balances</h3>
          {data && data.length > 0 && (
            <div className="data-lg text-amber mt-1">
              {formatAED(data.reduce((sum, item) => sum + item.balance, 0))}
            </div>
          )}
        </div>
        <Link href="/reports" className="group flex items-center gap-1.5 text-[11px] font-medium text-espresso-muted hover:text-espresso transition-colors">
          Full report
          <span className="group-hover:translate-x-0.5 transition-transform">
            <Icon icon={ArrowRight} size={11} />
          </span>
        </Link>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-11 skeleton-shimmer rounded-lg" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyAllClear />
      ) : (
        <div className="space-y-0">
          {data.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i < 8 ? i * 0.04 : 0,
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <LeaderRow item={item} rank={i + 1} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function LeaderRow({ item, rank }: { item: any; rank: number }) {
  const isTopRow = rank === 1
  const isHighDebt = item.balance > 5000
  return (
    <Link
      href={`/contracts?q=${encodeURIComponent(item.name)}`}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150",
        rank % 2 === 0 ? "bg-sand-100/30" : "bg-transparent",
        "hover:bg-sand-200/40",
        isTopRow && "border-l border-rust"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="body truncate">{item.name}</div>
        <div className="body text-espresso-muted mt-0.5 truncate">
          {item.rooms.slice(0, 3).join(', ')}{item.rooms.length > 3 ? '…' : ''}
        </div>
      </div>
      <div className={cn(
        "data-md text-right",
        isTopRow && "font-bold",
        isHighDebt ? "text-rust" : "text-espresso"
      )}>
        {formatAED(item.balance)}
      </div>
    </Link>
  )
}

function EmptyAllClear() {
  return (
    <div className="py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-teal-pale text-teal grid place-items-center mx-auto mb-3">
        <Icon icon={Warning} size={16} />
      </div>
      <div className="text-[13px] font-medium text-espresso">All clear</div>
      <div className="text-[11px] text-espresso-muted mt-1">No outstanding balances this month.</div>
    </div>
  )
}
