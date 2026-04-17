'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { ContractCard } from '@/components/contracts/ContractCard'
import { cn } from '@/lib/utils'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

type StatusFilter = 'all' | 'active' | 'expired' | 'legal_dispute' | 'terminated'
type UrgencyFilter = 'all' | 'critical' | 'warning' | 'healthy'

export default function ContractsPage() {
  const [status, setStatus] = useState<StatusFilter>('active')
  const [urgency, setUrgency] = useState<UrgencyFilter>('all')
  const [q, setQ] = useState('')

  const { data } = useQuery({
    queryKey: ['contracts', status, urgency, q],
    queryFn: () => endpoints.contracts({
      ...(status !== 'all' ? { status } : {}),
      ...(urgency !== 'all' ? { urgency } : {}),
      ...(q ? { q } : {}),
      limit: 200,
    }),
  })

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <div className="eyebrow mb-2">Legal & contractual</div>
        <h1 className="display-lg">Contracts</h1>
        <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
          Yearly, Ejari, and BGC contracts. Renew, flag for legal, or add notes.
        </p>
      </div>

      <div className="bezel p-3 flex items-center gap-2 flex-wrap">
        <div className="flex-1 flex items-center gap-2 min-w-[240px]">
          <Icon icon={MagnifyingGlass} size={14} className="text-espresso-muted ml-2" />
          <input placeholder="Search by company, room, or ejari number..." value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent outline-none font-body text-sm text-espresso placeholder:text-espresso-subtle py-1" />
        </div>
        {([
          ['all', 'All'], ['active', 'Active'], ['expired', 'Expired'],
          ['legal_dispute', 'Legal'], ['terminated', 'Terminated'],
        ] as [StatusFilter, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)}
            className={cn('px-3 h-9 rounded-lg text-[11px] font-medium transition-colors',
              status === v ? 'bg-espresso text-sand-50' : 'bg-sand-100 text-espresso-muted hover:bg-sand-200')}>
            {l}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 skeleton-shimmer rounded-xl" />)}
        </div>
      ) : data.data.length === 0 ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso">No contracts match your filters</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.data.map((contract: any, i: number) => (
            <ContractCard key={contract.id} contract={contract} delay={i * 0.04} />
          ))}
        </div>
      )}
    </div>
  )
}
