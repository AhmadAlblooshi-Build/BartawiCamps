'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { endpoints } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { Search, Plus, Building2, User } from 'lucide-react'
import CreateLeaseWizard from '@/components/leases/CreateLeaseWizard'

const STATUS_COLORS: Record<string, string> = {
  active: '#1E4D52',
  draft: '#B8883D',
  expired: '#8B6420',
  closed: '#6A6159',
  terminated: '#A84A3B'
}

export default function LeasesPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [wizardOpen, setWizardOpen] = useState(false)
  const router = useRouter()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useQuery({
    queryKey: ['leases', statusFilter, debouncedQuery],
    queryFn: () => endpoints.leases({
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: debouncedQuery || undefined
    })
  })

  const leases = data?.leases || []
  const counts = data?.counts || { all: 0, active: 0, draft: 0, expired: 0, closed: 0, terminated: 0 }

  const filters = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'draft', label: 'Draft', count: counts.draft },
    { key: 'expired', label: 'Expired', count: counts.expired },
    { key: 'closed', label: 'Closed', count: counts.closed },
    { key: 'terminated', label: 'Terminated', count: counts.terminated },
  ]

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="eyebrow mb-1">TENANCIES</div>
          <h1 className="font-display text-[42px] italic leading-none" style={{ color: '#1A1816' }}>
            Leases
          </h1>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#1A1816',
            color: '#F4EFE7',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon icon={Plus} size={16} />
          New lease
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Icon icon={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6A6159' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tenant name or room number..."
          className="w-full h-11 pl-10 pr-4 bg-white border rounded-xl text-sm focus:outline-none"
          style={{ borderColor: '#D6CFC5', color: '#1A1816' }}
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className="px-4 h-9 rounded-full text-xs font-medium transition-all"
            style={{
              background: statusFilter === f.key ? '#1A1816' : '#FFFFFF',
              color: statusFilter === f.key ? '#F4EFE7' : '#6A6159',
              border: statusFilter === f.key ? 'none' : '1px solid #D6CFC5',
            }}
          >
            {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16 text-sm" style={{ color: '#6A6159' }}>
          Loading...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && leases.length === 0 && (
        <div className="text-center py-16">
          <div className="font-display text-[20px] italic mb-2" style={{ color: '#6A6159' }}>
            No leases match
          </div>
          <div className="text-xs" style={{ color: '#6A6159', opacity: 0.7 }}>
            Try adjusting your filters or search query
          </div>
        </div>
      )}

      {/* Lease Cards Grid */}
      {!isLoading && leases.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
        >
          {leases.map((lease: any, idx: number) => (
            <motion.div
              key={lease.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => router.push(`/tenants/${lease.tenant_id}`)}
              className="p-5 rounded-xl cursor-pointer transition-all"
              style={{
                background: '#FFFFFF',
                border: `2px solid ${lease.total_outstanding > 0 ? '#A84A3B' : '#D6CFC5'}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#B8883D'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 74, 59, 0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = lease.total_outstanding > 0 ? '#A84A3B' : '#D6CFC5'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Room + Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono font-bold text-[18px]" style={{ color: '#1A1816' }}>
                  {lease.room_number || 'TBD'}
                </div>
                <span style={{
                  fontSize: 9,
                  padding: '3px 8px',
                  background: `${STATUS_COLORS[lease.status] || '#6A6159'}1F`,
                  color: STATUS_COLORS[lease.status] || '#6A6159',
                  borderRadius: 999,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {lease.status}
                </span>
              </div>

              {/* Tenant Name */}
              <div className="flex items-center gap-2 mb-1">
                <div className="font-display italic text-[15px]" style={{ color: '#1A1816' }}>
                  {lease.tenant_name || 'Unknown'}
                </div>
                {lease.tenant_is_company && (
                  <span style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    background: '#B8883D1F',
                    color: '#B8883D',
                    borderRadius: 4,
                    fontWeight: 600,
                  }}>
                    Co.
                  </span>
                )}
              </div>

              {/* Block + Camp */}
              <div className="text-[11px] mb-3" style={{ color: '#6A6159' }}>
                {lease.block_code ? `Block ${lease.block_code}` : ''} {lease.block_code && lease.camp_name ? '· ' : ''} {lease.camp_name || ''}
              </div>

              {/* Contract Type + Dates */}
              <div className="text-[11px] mb-3" style={{ color: '#6A6159' }}>
                {lease.contract_type === 'yearly' ? 'Yearly' : 'Monthly'} · {
                  lease.start_date ? new Date(lease.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                } → {
                  lease.end_date ? new Date(lease.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Open'
                }
              </div>

              {/* Monthly Rent */}
              <div className="font-mono font-bold text-[14px] mb-2" style={{ color: '#1A1816' }}>
                {lease.monthly_rent?.toLocaleString()} SAR/mo
              </div>

              {/* Outstanding (if > 0) */}
              {lease.total_outstanding > 0 && (
                <div className="text-[11px] flex items-center gap-1" style={{ color: '#A84A3B' }}>
                  <span style={{ opacity: 0.7 }}>Outstanding:</span>
                  <span className="font-mono font-bold">{lease.total_outstanding.toLocaleString()} SAR</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      <CreateLeaseWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}
