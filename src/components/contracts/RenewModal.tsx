'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, FileText } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { formatAED } from '@/lib/utils'

export function RenewModal({ contract, onClose }: { contract: any; onClose: () => void }) {
  const oldEnd = contract.end_date ? new Date(contract.end_date) : new Date()
  const suggestedStart = new Date(oldEnd)
  suggestedStart.setDate(suggestedStart.getDate() + 1)
  const suggestedEnd = new Date(suggestedStart)
  suggestedEnd.setFullYear(suggestedEnd.getFullYear() + 1)

  const [startDate, setStartDate] = useState(suggestedStart.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(suggestedEnd.toISOString().slice(0, 10))
  const [newRent, setNewRent] = useState(Number(contract.monthly_rent))
  const [newEjari, setNewEjari] = useState('')
  const [notes, setNotes] = useState('')

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => endpoints.renewContract(contract.id, {
      new_start_date: startDate,
      new_end_date: endDate,
      new_monthly_rent: newRent,
      new_ejari_number: newEjari || undefined,
      renewal_notes: notes,
    }),
    onSuccess: () => {
      toast.success('Contract renewed', { description: `New period: ${startDate} → ${endDate}` })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Renewal failed'),
  })

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-[10vh] -translate-x-1/2 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Renew contract</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon icon={FileText} size={14} /></div>
                <div className="display-xs">Renew contract</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="px-6 py-5 space-y-4">
              {/* Current vs Proposed Terms Side-by-Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Current Terms */}
                <div className="bezel p-4 space-y-3">
                  <div className="eyebrow text-espresso-muted">Current Terms</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">Tenant</div>
                      <div className="text-[12px] text-espresso font-medium truncate">{contract.companies?.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">Room</div>
                      <div className="text-[12px] text-espresso font-mono tabular">{contract.rooms?.room_number}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-espresso-muted mb-0.5">Start</div>
                        <div className="text-[11px] text-espresso">{contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-espresso-muted mb-0.5">End</div>
                        <div className="text-[11px] text-espresso">{contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">Monthly Rent</div>
                      <div className="text-[13px] text-espresso font-mono tabular font-medium">{formatAED(contract.monthly_rent)}</div>
                    </div>
                    {contract.ejari_number && (
                      <div>
                        <div className="text-[10px] text-espresso-muted mb-0.5">Ejari</div>
                        <div className="text-[11px] text-espresso font-mono tabular">{contract.ejari_number}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposed Terms */}
                <div className="bezel p-4 space-y-3 bg-amber-50/30 border-amber-500/20">
                  <div className="eyebrow text-amber-600">Proposed Terms</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">Start Date</div>
                      <div className="text-[11px] text-espresso font-medium">{new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">End Date</div>
                      <div className="text-[11px] text-espresso font-medium">{new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-espresso-muted mb-0.5">Monthly Rent</div>
                      <div className="text-[13px] text-espresso font-mono tabular font-medium">
                        {formatAED(newRent)}
                        {newRent !== Number(contract.monthly_rent) && (
                          <span className={`ml-2 text-[10px] ${newRent > Number(contract.monthly_rent) ? 'text-rust' : 'text-teal'}`}>
                            {newRent > Number(contract.monthly_rent) ? '↑' : '↓'} {formatAED(Math.abs(newRent - Number(contract.monthly_rent)))}
                          </span>
                        )}
                      </div>
                    </div>
                    {newEjari && (
                      <div>
                        <div className="text-[10px] text-espresso-muted mb-0.5">Ejari</div>
                        <div className="text-[11px] text-espresso font-mono tabular">{newEjari}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="New start date *" type="date" value={startDate} onChange={setStartDate} />
                <Field label="New end date *"   type="date" value={endDate}   onChange={setEndDate} />
                <Field label="New monthly rent *" type="number" value={String(newRent)} onChange={v => setNewRent(Number(v) || 0)} mono />
                <Field label="New ejari number"   type="text"   value={newEjari} onChange={setNewEjari} mono />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Renewal notes</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Rent change rationale, negotiation outcome, etc."
                  className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
              </label>
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="px-4 h-9 rounded-full bg-teal text-white text-[12px] font-medium hover:bg-teal-light disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Renewing…' : 'Confirm renewal'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, type, value, onChange, mono = false }: {
  label: string; type: string; value: string; onChange: (v: string) => void; mono?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={`h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none ${mono ? 'font-mono tabular' : ''}`} />
    </label>
  )
}
