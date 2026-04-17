'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, FileText } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

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
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-[12vh] -translate-x-1/2 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Give notice</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ochre-pale text-ochre grid place-items-center"><Icon icon={FileText} size={14} /></div>
                <div className="display-xs">Give notice · Room {room.room_number}</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>
            <div className="px-6 py-5 space-y-4">
              <div className="text-[13px] text-espresso-soft leading-relaxed">
                Stage 1 of 2. Records that the tenant has given notice to vacate. Room will show as <strong>Vacating</strong> until you complete the checkout on or after the vacate date.
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Intended vacate date *</span>
                <input type="date" min={today} value={vacateDate} onChange={e => setVacateDate(e.target.value)}
                  className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                <span className="text-[10px] text-espresso-subtle">Defaults to 10 days from today (per standard notice period).</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Notes</span>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Reason for notice, special handling, replacement tenant details..."
                  className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
              </label>
            </div>
            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="px-4 h-9 rounded-full bg-ochre text-white text-[12px] font-medium hover:bg-ochre-light disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Recording…' : 'Record notice'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
