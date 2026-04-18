'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, CreditCard } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function LogPaymentModal({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [roomNumber, setRoomNumber] = useState('')
  const [amount, setAmount] = useState(0)
  const [amountDisplay, setAmountDisplay] = useState('')
  const [method, setMethod] = useState<'cash' | 'cheque' | 'bank_transfer' | 'other'>('cash')
  const [reference, setReference] = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [forMonth, setForMonth] = useState(new Date().getMonth() + 1)
  const [forYear, setForYear] = useState(new Date().getFullYear())
  const [notes, setNotes] = useState('')

  const handleAmountChange = (value: string) => {
    // Remove non-digit characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '')
    const numericValue = parseFloat(cleanValue) || 0
    setAmount(numericValue)

    // Format with thousand separator
    if (cleanValue) {
      const parts = cleanValue.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      setAmountDisplay(parts.join('.'))
    } else {
      setAmountDisplay('')
    }
  }

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => endpoints.logPayment({
      room_number: roomNumber,
      amount,
      payment_method: method,
      reference_number: reference || undefined,
      payment_date: paymentDate,
      for_month: forMonth,
      for_year: forYear,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Payment logged', { description: `AED ${amount.toLocaleString()} collected.` })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-[10vh] -translate-x-1/2 w-[560px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Log payment</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-pale text-teal grid place-items-center"><Icon icon={CreditCard} size={14} /></div>
                <div className="display-xs">Log payment</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Room *</span>
                  <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                    placeholder="A-12"
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Amount *</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-mono text-espresso-muted">AED</span>
                    <input
                      type="text"
                      value={amountDisplay}
                      onChange={e => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="h-10 pl-14 pr-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none w-full"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Method</span>
                  <select value={method} onChange={e => setMethod(e.target.value as any)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Payment date</span>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">For month</span>
                  <select value={forMonth} onChange={e => setForMonth(Number(e.target.value))}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">For year</span>
                  <input type="number" value={forYear} onChange={e => setForYear(Number(e.target.value))}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                {method !== 'cash' && (
                  <label className="flex flex-col gap-1.5 col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Reference</span>
                    <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                      placeholder={method === 'cheque' ? 'Cheque number' : 'Transaction reference'}
                      className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                  </label>
                )}
                <label className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Notes</span>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
                </label>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!roomNumber || amount <= 0 || mutation.isPending}
                className="px-4 h-9 rounded-full bg-teal text-white text-[12px] font-medium hover:bg-teal-light disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Logging…' : 'Log payment'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
