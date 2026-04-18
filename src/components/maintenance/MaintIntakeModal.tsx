'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, Wrench } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function MaintIntakeModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [roomNumber, setRoomNumber] = useState('')
  const [campId, setCampId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [suggestedTeam, setSuggestedTeam] = useState('')

  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })
  // Categories endpoint — using complaint_categories since they share the table
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => endpoints.complaints({ _categories: 'true' }).catch(() => ({ data: [] })) })

  // Update suggested team when category changes
  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId)
    if (newCategoryId && (categories as any)?.data) {
      const selectedCategory = (categories as any).data.find((c: any) => c.id === newCategoryId)
      if (selectedCategory?.default_team) {
        setSuggestedTeam(selectedCategory.default_team.name)
      } else {
        setSuggestedTeam('General Team')
      }
    } else {
      setSuggestedTeam('General Team')
    }
  }

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => endpoints.createMaint({
      camp_id: campId,
      title,
      description,
      priority,
      category_id: categoryId || undefined,
      room_number: roomNumber || undefined,
    }),
    onSuccess: () => {
      toast.success('Request created', { description: 'Auto-assigned to the appropriate team.' })
      qc.invalidateQueries({ queryKey: ['maintenance'] })
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
            className="fixed left-1/2 top-[8vh] -translate-x-1/2 w-[560px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">New maintenance request</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon icon={Wrench} size={14} /></div>
                <div className="display-xs">New maintenance request</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Short title *</span>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Leaking pipe under sink"
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Description *</span>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Camp *</span>
                  <select value={campId} onChange={e => setCampId(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    <option value="">Select camp...</option>
                    {camps?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Room</span>
                  <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                    placeholder="A-12"
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Category</span>
                  <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    <option value="">Auto (will route to General team)</option>
                    {(categories as any)?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
              {suggestedTeam && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bezel p-3 text-[12px] bg-teal-pale border border-teal/10"
                >
                  <span className="text-espresso-muted">Will be assigned to:</span>{' '}
                  <strong className="text-teal">{suggestedTeam}</strong>
                </motion.div>
              )}
              {!suggestedTeam && (
                <div className="bezel p-3 text-[11px] text-espresso-muted">
                  <strong className="text-espresso">Auto-assignment:</strong> If you pick a category with a default team,
                  the request will be routed to them automatically and the team lead will be notified.
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!title || !description || !campId || mutation.isPending}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Creating…' : 'Create request'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
