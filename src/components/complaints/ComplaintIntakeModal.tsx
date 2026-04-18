'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, Sparkle, Plus } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

export function ComplaintIntakeModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('medium')
  const [roomNumber, setRoomNumber] = useState('')
  const [classifying, setClassifying] = useState(false)

  const qc = useQueryClient()

  // Auto-classify when text is typed + quiet for 800ms
  useEffect(() => {
    if (text.length < 20) return
    const t = setTimeout(async () => {
      setClassifying(true)
      try {
        const result = await endpoints.aiClassifyComplaint(text)
        if (result.category) setCategory(result.category)
        if (result.priority) setPriority(result.priority)
        if (result.title && !title) setTitle(result.title)
      } catch {} finally {
        setClassifying(false)
      }
    }, 800)
    return () => clearTimeout(t)
  }, [text])

  const mutation = useMutation({
    mutationFn: () => endpoints.createComplaint({
      title: title || text.slice(0, 100),
      description: text,
      priority,
      room_number: roomNumber || undefined,
      category_name: category || undefined,
    }),
    onSuccess: () => {
      toast.success('Complaint logged')
      qc.invalidateQueries({ queryKey: ['complaints'] })
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
            <Dialog.Title className="sr-only">Log complaint</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rust-pale text-rust grid place-items-center"><Icon icon={Plus} size={14} /></div>
                <div className="display-xs">Log a complaint</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="px-6 py-5 space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Describe the issue *</span>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                  placeholder="e.g. Tenant reports the AC in room B-12 stopped cooling yesterday evening, and sleeping is difficult..."
                  className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
              </label>

              {(classifying || category) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bezel p-3 flex items-start gap-3 bg-teal-pale border border-teal/10"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal text-sand-50 grid place-items-center shrink-0">
                    <Icon icon={Sparkle} size={12} emphasis />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="eyebrow text-teal">AI Suggests</span>
                      {classifying && <span className="live-pulse w-1.5 h-1.5 rounded-full bg-teal" />}
                    </div>
                    {category ? (
                      <div className="text-[12px] text-espresso">
                        Category: <strong>{category}</strong> · Priority: <strong className="capitalize">{priority}</strong>
                      </div>
                    ) : <div className="text-[12px] text-espresso-muted">Analyzing…</div>}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Room</span>
                  <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                    placeholder="A-12"
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Priority</span>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!text || mutation.isPending}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Logging…' : 'Log complaint'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
