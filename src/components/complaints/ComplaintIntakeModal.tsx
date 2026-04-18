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
        <Dialog.Overlay className="scrim fixed inset-0 z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            className="fixed left-1/2 top-[10vh] -translate-x-1/2 w-[520px] max-w-[calc(100vw-2rem)] bg-sand-50 rounded-2xl elevation-float z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Log complaint</Dialog.Title>
            <header className="px-8 pt-6 pb-4">
              <div className="display-md mb-1">Log a Complaint</div>
              <div className="overline text-espresso-muted">Report tenant issue or concern</div>
              <div className="divider-warm mt-4" />
              <button onClick={onClose} className="absolute top-6 right-8 w-8 h-8 rounded-full bg-sand-200 grid place-items-center hover:bg-amber hover:text-white transition-colors"><Icon icon={X} size={14} /></button>
            </header>

            <div className="px-8 py-5 space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="overline text-espresso-muted">Describe the issue *</span>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                  placeholder="e.g. Tenant reports the AC in room B-12 stopped cooling yesterday evening, and sleeping is difficult..."
                  className="px-3 py-2 bg-white border border-sand-200 rounded-xl text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
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
                  <span className="overline text-espresso-muted">Room</span>
                  <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                    placeholder="A-12"
                    className="h-11 px-3 bg-white border border-sand-200 rounded-xl text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="overline text-espresso-muted">Priority</span>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="h-11 px-3 bg-white border border-sand-200 rounded-xl text-[13px] focus:border-amber-500 focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
            </div>

            <footer className="px-8 py-4 bg-sand-50 flex justify-end gap-3">
              <div className="divider-warm mb-4 -mx-8" />
              <button onClick={onClose} className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-[12px] font-medium hover:bg-espresso hover:text-sand-50 transition-all">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!text || mutation.isPending}
                className="px-5 h-11 rounded-full bg-amber text-espresso text-[12px] font-medium hover:bg-amber/90 disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Logging…' : 'Log complaint'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
