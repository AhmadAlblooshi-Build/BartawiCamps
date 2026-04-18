'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { ContractCard } from '@/components/contracts/ContractCard'
import { cn } from '@/lib/utils'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

type StatusFilter = 'all' | 'active' | 'expired' | 'legal_dispute' | 'terminated'
type UrgencyFilter = 'all' | 'expiring_soon' | 'legal' | 'active'

export default function ContractsPage() {
  const [urgency, setUrgency] = useState<UrgencyFilter>('all')
  const [q, setQ] = useState('')

  const { data } = useQuery({
    queryKey: ['contracts', urgency, q],
    queryFn: () => endpoints.contracts({
      ...(q ? { q } : {}),
      limit: 200,
    }),
  })

  // Calculate badge counts for urgency tabs
  const counts = useMemo(() => {
    if (!data?.data) return { all: 0, expiring_soon: 0, legal: 0, active: 0 }
    const contracts = data.data
    return {
      all: contracts.length,
      expiring_soon: contracts.filter((c: any) => {
        if (!c.end_date) return false
        const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return days >= 0 && days <= 90
      }).length,
      legal: contracts.filter((c: any) => c.status === 'legal_dispute').length,
      active: contracts.filter((c: any) => {
        if (!c.end_date) return false
        const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return days > 90
      }).length,
    }
  }, [data])

  // Filter contracts based on selected urgency tab
  const filtered = useMemo(() => {
    if (!data?.data) return []
    if (urgency === 'all') return data.data
    if (urgency === 'legal') return data.data.filter((c: any) => c.status === 'legal_dispute')

    const contracts = data.data.filter((c: any) => {
      if (!c.end_date) return false
      const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (urgency === 'expiring_soon') return days >= 0 && days <= 90
      if (urgency === 'active') return days > 90
      return false
    })
    return contracts
  }, [data, urgency])

  return (
    <div className="space-y-8 atmosphere">
      <div className="animate-rise">
        <h1 className="display-lg">Contracts</h1>
        <p className="overline mt-2">
          Yearly, Ejari, and BGC contracts · Renew, flag for legal, or add notes
        </p>
      </div>

      {/* Filter bar - evolved styling */}
      <div className="rounded-[14px] p-3 flex items-center gap-2 flex-wrap" style={{ background: 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.6)' }}>
        <div className="flex-1 flex items-center gap-2 min-w-[240px]">
          <Icon icon={MagnifyingGlass} size={14} className="text-espresso-muted ml-2" />
          <input placeholder="Search by company, room, or ejari number..." value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent outline-none font-body text-sm text-espresso placeholder:text-espresso-subtle py-1" />
        </div>
      </div>

      {/* Urgency filter tabs with badge counts */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          ['all', 'All'],
          ['expiring_soon', 'Expiring Soon'],
          ['legal', 'Legal Dispute'],
          ['active', 'Active'],
        ] as [UrgencyFilter, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setUrgency(v)}
            className={cn(
              'px-3 h-9 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-2',
              urgency === v ? 'text-amber' : 'bg-sand-200 text-espresso-muted hover:bg-sand-200'
            )}
            style={urgency === v ? { background: 'rgba(184, 136, 61, 0.1)' } : {}}
          >
            {l}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono tabular',
              urgency === v ? 'bg-sand-50/20 text-amber' : 'bg-sand-200 text-espresso-muted'
            )}>
              {counts[v]}
            </span>
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 skeleton-shimmer rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso">No contracts match your filters</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((contract: any, i: number) => (
            <ContractCard key={contract.id} contract={contract} delay={i * 0.04} />
          ))}
        </div>
      )}
    </div>
  )
}
