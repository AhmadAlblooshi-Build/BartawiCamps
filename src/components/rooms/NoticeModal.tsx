'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, FileText, User } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { scaleUp } from '@/lib/motion'

export function NoticeModal({ room, onClose }: { room: any; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultVacate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [vacateDate, setVacateDate] = useState(defaultVacate)
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => endpoints.notice({
      camp_id: room.camp_id, room_id: room.id,
      occupancy_id: room.current_occupancy?.id,
      intended_vacate_date: vacateDate,
      notes,
    }),
    onSuccess: () => {
      toast.success('Notice recorded', { description: `Room ${room.room_number} is now vacating.` })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room', room.id] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to record notice'),
  })

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim fixed inset-0 z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            className="fixed left-1/2 top-[12vh] -translate-x-1/2 w-[400px] max-w-[calc(100vw-2rem)] bg-sand-50 rounded-2xl elevation-float z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Give notice</Dialog.Title>
            <header className="px-8 pt-6 pb-4">
              <div className="display-md mb-1">Notice to Vacate</div>
              <div className="overline text-espresso-muted">Stage 1 of checkout process</div>
              <div className="divider-warm mt-4" />
              <button onClick={onClose} className="absolute top-6 right-8 w-8 h-8 rounded-full bg-sand-200 grid place-items-center hover:bg-amber hover:text-white transition-colors"><Icon icon={X} size={14} /></button>
            </header>
            <div className="px-8 py-5 space-y-4">
              {/* Tenant info summary card */}
              <div className="bezel p-4 bg-sand-50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-espresso text-sand-50 grid place-items-center shrink-0">
                    <Icon icon={User} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-espresso mb-0.5">
                      {room.current_occupancy?.individual?.full_name || room.current_occupancy?.individual?.owner_name || 'Tenant'}
                    </div>
                    <div className="text-[11px] text-espresso-muted">
                      Room {room.room_number}
                      {room.current_occupancy?.company_name && <> · {room.current_occupancy.company_name}</>}
                    </div>
                    {room.current_occupancy?.check_in_date && (
                      <div className="text-[11px] text-espresso-muted mt-1">
                        Checked in {new Date(room.current_occupancy.check_in_date).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[13px] text-espresso-soft leading-relaxed">
                Stage 1 of 2. Records that the tenant has given notice to vacate. Room will show as <strong>Vacating</strong> until you complete the checkout on or after the vacate date.
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="overline text-espresso-muted">Intended vacate date *</span>
                <input type="date" min={today} value={vacateDate} onChange={e => setVacateDate(e.target.value)}
                  className="h-11 px-3 bg-white border border-sand-200 rounded-xl text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                <span className="text-[10px] text-espresso-subtle">Defaults to 10 days from today (per standard notice period).</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="overline text-espresso-muted">Notes</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Reason for notice, special handling, replacement tenant details..."
                  className="px-3 py-2 bg-white border border-sand-200 rounded-xl text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
              </label>
            </div>
            <footer className="px-8 py-4 bg-sand-50 flex justify-end gap-3">
              <div className="divider-warm mb-4 -mx-8" />
              <button onClick={onClose} className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-[12px] font-medium hover:bg-espresso hover:text-sand-50 transition-all">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="px-5 h-11 rounded-full bg-amber text-espresso text-[12px] font-medium hover:bg-amber/90 disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Recording…' : 'Record notice'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
