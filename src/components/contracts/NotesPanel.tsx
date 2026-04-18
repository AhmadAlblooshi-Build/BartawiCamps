'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { X, Note, Plus } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { formatDateTime, cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'general',     label: 'General',     tone: 'bg-sand-100 text-espresso-muted' },
  { value: 'financial',   label: 'Financial',   tone: 'bg-teal-pale text-teal' },
  { value: 'legal',       label: 'Legal',       tone: 'bg-plum-pale text-plum' },
  { value: 'maintenance', label: 'Maintenance', tone: 'bg-ochre-pale text-ochre' },
]

export function NotesPanel({ contract, onClose }: { contract: any; onClose: () => void }) {
  const [category, setCategory] = useState('general')
  const [content, setContent] = useState('')
  const qc = useQueryClient()

  const { data: notes } = useQuery({
    queryKey: ['contract-notes', contract.id],
    queryFn: () => endpoints.contractNotes(contract.id),
  })

  const addNote = useMutation({
    mutationFn: () => endpoints.addContractNote(contract.id, { category, content }),
    onSuccess: () => {
      toast.success('Note added')
      setContent('')
      qc.invalidateQueries({ queryKey: ['contract-notes', contract.id] })
    },
  })

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] max-w-[calc(100vw-2rem)] bg-white shadow-raise-4 z-50 flex flex-col"
          >
            <Dialog.Title className="sr-only">Contract notes</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sand-100 text-espresso-muted grid place-items-center"><Icon icon={Note} size={14} /></div>
                <div>
                  <div className="eyebrow">Notes</div>
                  <div className="text-[12px] text-espresso truncate max-w-[200px]">{contract.companies?.name}</div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!notes ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton-shimmer rounded-lg" />)}</div>
              ) : notes.data.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-espresso-muted">No notes yet.</div>
              ) : (
                <div className="space-y-4">
                  {/* Group notes by category */}
                  {CATEGORIES.map(cat => {
                    const categoryNotes = notes.data.filter((n: any) => n.category === cat.value)
                    if (categoryNotes.length === 0) return null

                    return (
                      <div key={cat.value}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', cat.tone)}>
                            {cat.label}
                          </span>
                          <div className="flex-1 h-px bg-sand-200" />
                          <span className="text-[10px] text-espresso-subtle font-mono tabular">{categoryNotes.length}</span>
                        </div>
                        <div className="space-y-2">
                          {categoryNotes.map((n: any) => (
                            <div key={n.id} className="bezel p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-[13px] text-espresso whitespace-pre-wrap flex-1">{n.content}</div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-espresso-subtle">
                                <span>{n.created_by_user?.full_name || n.created_by_user?.email || 'System'}</span>
                                <time className="font-mono tabular">{formatDateTime(n.created_at)}</time>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 space-y-3">
              <div className="flex items-center gap-1 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={cn('px-2.5 py-1 rounded text-[10px] font-medium transition-all',
                      category === c.value ? 'ring-2 ring-amber-500 ring-offset-1 ' + c.tone : c.tone + ' opacity-60 hover:opacity-100')}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={2}
                  placeholder="Add a note…"
                  className="flex-1 px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
                <button onClick={() => addNote.mutate()} disabled={!content || addNote.isPending}
                  className="h-10 px-3 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 flex items-center gap-1.5 transition-all">
                  <Icon icon={Plus} size={11} /> Add
                </button>
              </div>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
