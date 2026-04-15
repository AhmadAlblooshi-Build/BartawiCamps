'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { useCreatePayment } from '@/lib/queries'
import { formatAED } from '@/lib/utils'
import type { MonthlyRecord } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  record: MonthlyRecord | null
  campId: string
}

export function PaymentModal({ isOpen, onClose, record, campId }: Props) {
  const { mutateAsync, isPending } = useCreatePayment()
  const [form, setForm] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'card',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    reference_number: '',
    bank_name: '',
    cheque_number: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!record) return null

  const maxAmount = record.balance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > maxAmount) { setError(`Cannot exceed outstanding balance of ${formatAED(maxAmount)}`); return }
    try {
      await mutateAsync({
        monthly_record_id: record.id,
        room_id: record.room_id,
        camp_id: campId,
        amount: amt,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_number: form.reference_number || undefined,
        bank_name: form.bank_name || undefined,
        cheque_number: form.cheque_number || undefined,
        notes: form.notes || undefined,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed')
    }
  }

  const inp = 'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/50 transition-colors'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Payment">
      {success ? (
        <div className="py-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-status-occupied-dim border border-status-occupied/30 flex items-center justify-center">
            <span className="text-status-occupied text-2xl">✓</span>
          </div>
          <p className="font-heading font-semibold text-text-primary">Payment Recorded</p>
          <p className="text-text-muted text-sm">{formatAED(parseFloat(form.amount))} logged successfully</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary */}
          <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Room</span>
              <span className="font-mono font-semibold text-text-primary">{record.room?.room_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Tenant</span>
              <span className="text-text-secondary truncate max-w-[160px]">
                {record.company_name || record.owner_name || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
              <span className="text-text-muted">Outstanding Balance</span>
              <span className="font-mono font-bold text-status-vacant">{formatAED(record.balance)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Amount (AED) *</label>
            <input
              type="number"
              placeholder={`Max ${maxAmount.toLocaleString()}`}
              value={form.amount}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
              className={inp}
              required
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Payment Method *</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm(p => ({ ...p, payment_method: e.target.value as any }))}
              className={inp}
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Payment Date *</label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm(p => ({ ...p, payment_date: e.target.value }))}
              className={inp}
              required
            />
          </div>

          {/* Conditional fields */}
          {(form.payment_method === 'cheque') && (
            <div>
              <label className="block text-text-muted text-xs font-body mb-1.5">Cheque Number</label>
              <input
                type="text"
                placeholder="CHQ-001234"
                value={form.cheque_number}
                onChange={(e) => setForm(p => ({ ...p, cheque_number: e.target.value }))}
                className={inp}
              />
            </div>
          )}
          {(form.payment_method === 'bank_transfer') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-muted text-xs font-body mb-1.5">Bank Name</label>
                <input
                  type="text"
                  placeholder="Emirates NBD"
                  value={form.bank_name}
                  onChange={(e) => setForm(p => ({ ...p, bank_name: e.target.value }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-text-muted text-xs font-body mb-1.5">Reference</label>
                <input
                  type="text"
                  placeholder="REF123456"
                  value={form.reference_number}
                  onChange={(e) => setForm(p => ({ ...p, reference_number: e.target.value }))}
                  className={inp}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Notes</label>
            <input
              type="text"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              className={inp}
            />
          </div>

          {error && (
            <p className="text-status-vacant text-xs font-body bg-status-vacant-dim border border-status-vacant/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-accent-cyan text-bg-primary rounded-lg text-sm font-body font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50"
            >
              {isPending ? 'Processing...' : 'Log Payment'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
