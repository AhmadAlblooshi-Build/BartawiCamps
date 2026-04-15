'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { LogOut, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useCheckout } from '@/lib/queries'
import { formatAED } from '@/lib/utils'
import type { Room } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  room: Room
}

const REASONS = [
  'Voluntary departure',
  'Contract end',
  'Eviction',
  'Non-payment',
  'Transfer to another room',
  'Other',
]

export function CheckoutModal({ isOpen, onClose, room }: Props) {
  const { mutateAsync, isPending } = useCheckout()
  const [form, setForm] = useState({
    checkout_date: format(new Date(), 'yyyy-MM-dd'),
    reason_for_leaving: 'Voluntary departure',
    final_balance_settled: false,
    notes: '',
  })
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const tenantName =
    room.current_occupancy?.individual?.owner_name ||
    room.current_occupancy?.company?.name ||
    'Current occupant'

  const balance = room.monthly_records?.[0]?.balance ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await mutateAsync({
        room_id: room.id,
        camp_id: room.camp_id,
        occupancy_id: room.current_occupancy?.id,
        ...form,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1600)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Checkout failed')
    }
  }

  const inp = 'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-primary focus:outline-none focus:border-accent-cyan/50 transition-colors placeholder:text-text-dim'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Check Out Tenant">
      {success ? (
        <div className="py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-status-occupied-dim border border-status-occupied/30 flex items-center justify-center">
            <span className="text-status-occupied text-3xl">✓</span>
          </div>
          <div className="text-center">
            <p className="font-heading font-bold text-text-primary text-lg">Checked Out</p>
            <p className="text-text-muted text-sm mt-1">Room {room.room_number} is now vacant</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant summary */}
          <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Room</span>
              <span className="font-mono font-bold text-text-primary">{room.room_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Tenant</span>
              <span className="text-text-secondary truncate max-w-[180px]">{tenantName}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-status-vacant flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Outstanding balance
                </span>
                <span className="font-mono font-bold text-status-vacant">{formatAED(balance)}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Departure Date *</label>
            <input
              type="date"
              value={form.checkout_date}
              onChange={e => setForm(p => ({ ...p, checkout_date: e.target.value }))}
              className={inp}
              required
            />
          </div>

          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Reason for Leaving *</label>
            <select
              value={form.reason_for_leaving}
              onChange={e => setForm(p => ({ ...p, reason_for_leaving: e.target.value }))}
              className={inp}
            >
              {REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3.5 bg-bg-elevated border border-border rounded-xl hover:border-border-light transition-colors">
            <input
              type="checkbox"
              checked={form.final_balance_settled}
              onChange={e => setForm(p => ({ ...p, final_balance_settled: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-accent-cyan"
            />
            <div>
              <p className="text-text-secondary text-sm font-body font-medium">Balance fully settled</p>
              <p className="text-text-dim text-xs mt-0.5">All outstanding payments have been received</p>
            </div>
          </label>

          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className={`${inp} resize-none`}
              rows={2}
              placeholder="Any additional notes about this departure..."
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-status-vacant/80 text-white rounded-lg text-sm font-body font-semibold hover:bg-status-vacant transition-colors disabled:opacity-50">
              <LogOut className="w-4 h-4" />
              {isPending ? 'Processing...' : 'Confirm Check Out'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
