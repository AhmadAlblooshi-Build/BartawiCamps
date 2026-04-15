'use client'
import { useState } from 'react'
import { useCamps, useContracts, useUpdateContractStatus } from '@/lib/queries'
import { ContractCard } from '@/components/contracts/ContractCard'
import { RenewModal } from '@/components/contracts/RenewModal'
import { CampTabs } from '@/components/dashboard/CampTabs'
import { AlertTriangle, FileText, CheckCircle } from 'lucide-react'
import type { ContractWithDetails } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { label: 'All',           value: '' },
  { label: 'Active',        value: 'active' },
  { label: 'Expired',       value: 'expired' },
  { label: 'Legal Dispute', value: 'legal_dispute' },
  { label: 'Terminated',    value: 'terminated' },
]

export default function ContractsPage() {
  const { data: camps }                      = useCamps()
  const [activeCampId, setActiveCampId]      = useState<string | null>(null)
  const [statusFilter, setStatusFilter]      = useState('')
  const [renewTarget, setRenewTarget]        = useState<ContractWithDetails | null>(null)
  const { mutate: updateStatus }             = useUpdateContractStatus()

  const camp2 = camps?.find(c => c.code === 'C2')
  const effectiveCampId = activeCampId ?? camp2?.id ?? camps?.[0]?.id

  const { data, isLoading } = useContracts({
    campId: effectiveCampId,
    status: statusFilter || undefined,
  })

  const contracts: ContractWithDetails[] = data?.data ?? []

  const expiredCount  = contracts.filter(c => c.urgency === 'expired').length
  const criticalCount = contracts.filter(c => c.urgency === 'critical').length
  const urgentTotal   = expiredCount + criticalCount

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Contracts</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} — sorted by urgency
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted font-body px-3 py-2 bg-bg-elevated border border-border rounded-lg">
          <FileText className="w-3.5 h-3.5" />
          Camp 2 formal contracts only
        </div>
      </div>

      {/* Urgent alert banner */}
      {urgentTotal > 0 ? (
        <div className="flex items-center gap-4 px-5 py-4 bg-status-vacant-dim border border-status-vacant/30 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-status-vacant/20 border border-status-vacant/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-vacant" />
          </div>
          <div className="flex-1">
            <p className="text-status-vacant font-body font-bold text-sm">
              {urgentTotal} contract{urgentTotal !== 1 ? 's' : ''} need immediate attention
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {expiredCount > 0 && `${expiredCount} expired`}
              {expiredCount > 0 && criticalCount > 0 && '  ·  '}
              {criticalCount > 0 && `${criticalCount} expiring within 30 days`}
              {' ·  Click Renew to resolve'}
            </p>
          </div>
        </div>
      ) : contracts.length > 0 ? (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-status-occupied-dim border border-status-occupied/20 rounded-2xl">
          <CheckCircle className="w-4 h-4 text-status-occupied" />
          <p className="text-status-occupied text-sm font-body">All contracts are in good standing</p>
        </div>
      ) : null}

      {/* Camp tabs */}
      {camps && camps.length > 0 && (
        <CampTabs
          camps={camps}
          activeCampId={effectiveCampId ?? ''}
          onChange={setActiveCampId}
        />
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-body transition-all border',
              statusFilter === f.value
                ? 'bg-bg-card border-border text-text-primary shadow-sm'
                : 'bg-bg-elevated border-border/50 text-text-muted hover:text-text-secondary hover:border-border'
            )}
          >
            {f.label}
            {f.value === '' && (
              <span className="ml-2 text-text-dim text-xs">{contracts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contracts grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-2xl p-5 h-56">
              <div className="skeleton h-5 w-40 mb-3 rounded" />
              <div className="skeleton h-4 w-24 mb-4 rounded" />
              <div className="skeleton h-16 w-full mb-3 rounded" />
              <div className="skeleton h-10 w-full rounded" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-text-muted" />
          </div>
          <p className="text-text-secondary font-body font-medium">No contracts found</p>
          <p className="text-text-dim text-sm mt-1">
            {statusFilter ? `No contracts with status "${statusFilter}"` : 'No Camp 2 contracts in the database'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              onRenew={setRenewTarget}
              onTerminate={(id) => updateStatus({ id, status: 'terminated' })}
              onMarkLegal={(id) => updateStatus({ id, status: 'legal_dispute' })}
            />
          ))}
        </div>
      )}

      <RenewModal
        isOpen={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        contract={renewTarget}
      />
    </div>
  )
}
