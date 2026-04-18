'use client'
import { useState } from 'react'
import { motion } from 'motion/react'
import { formatAED, formatDate, daysUntil, cn } from '@/lib/utils'
import { FileText, CheckCircle, Warning, Shield, Note } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { RenewModal } from './RenewModal'
import { NotesPanel } from './NotesPanel'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'

export function ContractCard({ contract, delay = 0 }: { contract: any; delay?: number }) {
  const [renewOpen, setRenewOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const qc = useQueryClient()

  const days = contract.end_date ? daysUntil(contract.end_date) : null

  // Determine urgency and styling based on contract status and days remaining
  // Legal dispute gets special plum color regardless of expiry
  const isLegal = contract.status === 'legal_dispute'
  const urgency: 'legal' | 'expired' | 'critical' | 'warning' | 'healthy' =
    isLegal ? 'legal'
    : days === null ? 'healthy'
    : days < 0 ? 'expired'
    : days <= 30 ? 'critical'
    : days <= 90 ? 'warning'
    : 'healthy'

  const tones = {
    legal:    { bar: 'bg-plum',  pill: 'bg-plum-pale text-plum',     label: 'Legal Dispute' },
    expired:  { bar: 'bg-rust',  pill: 'bg-rust-pale text-rust',     label: `${Math.abs(days ?? 0)}d overdue` },
    critical: { bar: 'bg-rust',  pill: 'bg-rust-pale text-rust',     label: `${days ?? 0}d left` },
    warning:  { bar: 'bg-ochre', pill: 'bg-ochre-pale text-ochre',   label: `${days ?? 0}d left` },
    healthy:  { bar: 'bg-teal',  pill: 'bg-teal-pale text-teal',     label: 'Active' },
  }[urgency]

  const ack = useMutation({
    mutationFn: () => endpoints.ackAlert(contract.id),
    onSuccess: () => {
      toast.success('Alert acknowledged')
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })

  const flagLegal = useMutation({
    mutationFn: () => endpoints.updateContractStatus(contract.id, { status: contract.status === 'legal_dispute' ? 'active' : 'legal_dispute' }),
    onSuccess: () => {
      toast.success(contract.status === 'legal_dispute' ? 'Removed from legal dispute' : 'Flagged as legal dispute')
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
        className="bezel overflow-hidden group"
      >
        <div className="flex items-stretch">
          <div className={cn('w-1 shrink-0', tones.bar)} />
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="eyebrow">{contract.contract_type?.toUpperCase()}</span>
                  {contract.ejari_number && <span className="font-mono tabular text-[10px] text-espresso-subtle">· {contract.ejari_number}</span>}
                </div>
                <div className="text-[15px] font-medium text-espresso truncate">{contract.companies?.name || '—'}</div>
                <div className="text-[11px] text-espresso-muted mt-0.5">Room <span className="font-mono tabular">{contract.rooms?.room_number}</span></div>
              </div>
              <div className={cn('px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap', tones.pill)}>
                {tones.label}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 border-y border-[color:var(--color-border-subtle)]">
              <div>
                <div className="eyebrow mb-0.5">Rent</div>
                <div className="font-mono tabular text-[13px] text-espresso">{formatAED(contract.monthly_rent)}</div>
              </div>
              <div>
                <div className="eyebrow mb-0.5">Start</div>
                <div className="text-[12px] text-espresso">{formatDate(contract.start_date)}</div>
              </div>
              <div>
                <div className="eyebrow mb-0.5">Ends</div>
                <div className="text-[12px] text-espresso">{contract.end_date ? formatDate(contract.end_date) : '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              {urgency !== 'healthy' && !contract.alert_acknowledged_at && (
                <button onClick={() => ack.mutate()} disabled={ack.isPending}
                  className="h-8 px-3 rounded-full bg-sand-100 text-espresso-muted text-[11px] font-medium hover:bg-sand-200 transition-colors flex items-center gap-1.5">
                  <Icon icon={CheckCircle} size={11} />
                  Acknowledge
                </button>
              )}
              <button onClick={() => setRenewOpen(true)}
                className="h-8 px-3 rounded-full bg-espresso text-sand-50 text-[11px] font-medium hover:bg-espresso-soft transition-colors flex items-center gap-1.5">
                <Icon icon={FileText} size={11} />
                Renew
              </button>
              <button onClick={() => flagLegal.mutate()} disabled={flagLegal.isPending}
                className={cn('h-8 px-3 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5',
                  contract.status === 'legal_dispute' ? 'bg-plum text-white' : 'bg-sand-100 text-espresso-muted hover:bg-sand-200')}>
                <Icon icon={Shield} size={11} />
                {contract.status === 'legal_dispute' ? 'Legal · clear' : 'Flag legal'}
              </button>
              <button onClick={() => setNotesOpen(true)}
                className="h-8 px-3 rounded-full bg-sand-100 text-espresso-muted text-[11px] font-medium hover:bg-sand-200 transition-colors flex items-center gap-1.5">
                <Icon icon={Note} size={11} />
                Notes
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {renewOpen && <RenewModal contract={contract} onClose={() => setRenewOpen(false)} />}
      {notesOpen && <NotesPanel contract={contract} onClose={() => setNotesOpen(false)} />}
    </>
  )
}
