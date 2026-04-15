'use client'
import { useState } from 'react'
import { format, addMonths, addYears } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useRenewContract } from '@/lib/queries'
import { formatAED, formatDate } from '@/lib/utils'
import type { ContractWithDetails } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  contract: ContractWithDetails | null
}

export function RenewModal({ isOpen, onClose, contract }: Props) {
  const { mutateAsync, isPending } = useRenewContract()
  const [endDate, setEndDate]   = useState('')
  const [newRent, setNewRent]   = useState('')
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  if (!contract) return null

  const presets = [
    { label: '+1 Month',  date: format(addMonths(new Date(), 1),  'yyyy-MM-dd') },
    { label: '+6 Months', date: format(addMonths(new Date(), 6),  'yyyy-MM-dd') },
    { label: '+1 Year',   date: format(addYears(new Date(), 1),   'yyyy-MM-dd') },
    { label: '+2 Years',  date: format(addYears(new Date(), 2),   'yyyy-MM-dd') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!endDate) { setError('New end date is required'); return }
    try {
      await mutateAsync({
        id: contract.id,
        new_end_date: endDate,
        new_monthly_rent: newRent ? parseFloat(newRent) : undefined,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setEndDate(''); setNewRent(''); onClose() }, 1600)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Renewal failed')
    }
  }

  const inp = 'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/50 transition-colors'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renew Contract">
      {success ? (
        <div className="py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-status-occupied-dim border border-status-occupied/30 flex items-center justify-center">
            <span className="text-status-occupied text-3xl">✓</span>
          </div>
          <div className="text-center">
            <p className="font-heading font-bold text-text-primary text-lg">Contract Renewed</p>
            <p className="text-text-muted text-sm mt-1">All expiry alerts cleared automatically</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary */}
          <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Company</span>
              <span className="text-text-primary font-medium truncate max-w-[180px]">
                {contract.companies?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Room</span>
              <span className="font-mono text-text-secondary">{contract.rooms?.room_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Current End Date</span>
              <span className={`text-sm font-medium ${
                contract.urgency === 'expired' ? 'text-status-vacant' :
                contract.urgency === 'critical' ? 'text-status-legal' :
                'text-text-secondary'
              }`}>{formatDate(contract.end_date)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-text-muted">Current Rent</span>
              <span className="number-cell font-bold text-text-primary">{formatAED(contract.monthly_rent)}</span>
            </div>
          </div>

          {/* Date presets */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-2">New End Date *</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {presets.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setEndDate(p.date)}
                  className={`py-2 rounded-lg text-xs font-body font-medium transition-all border ${
                    endDate === p.date
                      ? 'bg-accent-glow border-accent-cyan/40 text-accent-cyan shadow-sm'
                      : 'bg-bg-elevated border-border text-text-muted hover:text-text-secondary hover:border-border-light'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inp}
              required
            />
          </div>

          {/* Optional new rent */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">
              New Monthly Rent (AED)
              <span className="ml-2 text-text-dim">— leave blank to keep {formatAED(contract.monthly_rent)}</span>
            </label>
            <input
              type="number"
              placeholder={String(contract.monthly_rent)}
              value={newRent}
              onChange={e => setNewRent(e.target.value)}
              className={inp}
            />
          </div>

          {error && (
            <p className="text-status-vacant text-xs bg-status-vacant-dim border border-status-vacant/20 rounded-lg px-3 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-muted hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-cyan text-bg-primary rounded-lg text-sm font-body font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Renewing...' : 'Confirm Renewal'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
