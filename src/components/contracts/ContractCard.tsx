'use client'
import { formatDate, formatAED, cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AlertTriangle, RefreshCw, XCircle, Scale, Clock } from 'lucide-react'
import type { ContractWithDetails } from '@/lib/types'

interface Props {
  contract: ContractWithDetails
  onRenew:      (contract: ContractWithDetails) => void
  onTerminate:  (id: string) => void
  onMarkLegal:  (id: string) => void
}

const URGENCY = {
  expired:  { ring: 'border-status-vacant/50',  glow: 'bg-status-vacant-dim',  tag: 'EXPIRED',    tagColor: 'bg-status-vacant-dim text-status-vacant' },
  critical: { ring: 'border-status-legal/50',   glow: 'bg-status-legal-dim',   tag: '≤30 DAYS',   tagColor: 'bg-status-legal-dim text-status-legal' },
  warning:  { ring: 'border-orange-500/40',     glow: 'bg-orange-500/5',       tag: '≤60 DAYS',   tagColor: 'bg-orange-500/10 text-orange-400' },
  notice:   { ring: 'border-yellow-500/30',     glow: 'bg-yellow-500/5',       tag: '≤90 DAYS',   tagColor: 'bg-yellow-500/10 text-yellow-400' },
  healthy:  { ring: 'border-border',            glow: '',                       tag: 'ACTIVE',     tagColor: 'bg-status-occupied-dim text-status-occupied' },
}

export function ContractCard({ contract, onRenew, onTerminate, onMarkLegal }: Props) {
  const u   = URGENCY[contract.urgency] || URGENCY.healthy
  const exp = contract.urgency === 'expired' || contract.urgency === 'critical'
  const days = contract.days_until_expiry

  return (
    <div className={cn(
      'relative bg-bg-card border rounded-2xl p-5 transition-all duration-200 hover:border-border-light overflow-hidden group',
      u.ring,
      exp ? u.glow : ''
    )}>
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1.5">
            {exp && <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', contract.urgency === 'expired' ? 'text-status-vacant' : 'text-status-legal')} />}
            <h3 className="font-heading font-bold text-text-primary truncate text-base leading-tight">
              {contract.companies?.name || '—'}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-text-muted text-xs">{contract.rooms?.room_number}</span>
            <span className="text-text-dim text-xs">·</span>
            <StatusBadge status={contract.contract_type} />
            {contract.status !== 'active' && <StatusBadge status={contract.status} />}
          </div>
        </div>
        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-body font-bold tracking-wider flex-shrink-0', u.tagColor)}>
          {u.tag}
        </span>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Monthly</p>
          <p className="number-cell text-text-secondary text-sm font-semibold">{formatAED(contract.monthly_rent)}</p>
        </div>
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-text-dim text-[10px] uppercase tracking-wide mb-1">Start</p>
          <p className="text-text-secondary text-xs">{formatDate(contract.start_date)}</p>
        </div>
        <div className={cn('rounded-xl p-3 text-center', exp ? u.glow : 'bg-bg-elevated')}>
          <p className="text-text-dim text-[10px] uppercase tracking-wide mb-1">
            {contract.urgency === 'expired' ? 'Expired' : 'Expires'}
          </p>
          <p className={cn(
            'text-xs font-semibold',
            contract.urgency === 'expired' ? 'text-status-vacant' :
            contract.urgency === 'critical' ? 'text-status-legal' :
            contract.urgency === 'warning' ? 'text-orange-400' :
            'text-text-secondary'
          )}>
            {contract.end_date ? formatDate(contract.end_date) : '—'}
            {days !== null && days >= 0 && days <= 90 && (
              <span className="block text-[10px] mt-0.5 font-normal">{days}d remaining</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      {contract.status !== 'terminated' && (
        <div className="flex gap-2">
          {contract.status !== 'legal_dispute' ? (
            <>
              <button
                onClick={() => onRenew(contract)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-accent-glow border border-accent-cyan/20 rounded-xl text-accent-cyan text-xs font-body font-semibold hover:bg-accent-cyan/15 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Renew Contract
              </button>
              <button
                onClick={() => onMarkLegal(contract.id)}
                title="Mark as legal dispute"
                className="w-9 h-9 flex items-center justify-center bg-bg-elevated border border-border rounded-xl text-status-legal hover:bg-status-legal-dim hover:border-status-legal/20 transition-colors"
              >
                <Scale className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTerminate(contract.id)}
                title="Terminate contract"
                className="w-9 h-9 flex items-center justify-center bg-bg-elevated border border-border rounded-xl text-text-muted hover:bg-status-vacant-dim hover:border-status-vacant/20 hover:text-status-vacant transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-status-legal-dim border border-status-legal/20 rounded-xl">
              <Scale className="w-3.5 h-3.5 text-status-legal" />
              <span className="text-status-legal text-xs font-body font-medium">Legal dispute in progress</span>
              <button onClick={() => onRenew(contract)} className="ml-auto text-accent-cyan text-xs hover:underline">
                Resolve →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
