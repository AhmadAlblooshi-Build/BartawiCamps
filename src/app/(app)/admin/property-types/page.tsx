'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash, House, Bed, Wrench, Storefront, Buildings, X, Check, WarningCircle } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { scaleUp, slideUp, staggerContainer, staggerItem } from '@/lib/motion'

const ICON_MAP: Record<string, any> = {
  house: House, bed: Bed, wrench: Wrench, storefront: Storefront, buildings: Buildings,
}

export default function PropertyTypesPage() {
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null)
  const { data } = useQuery({ queryKey: ['property-types'], queryFn: () => endpoints.propertyTypes() })
  const qc = useQueryClient()

  const deleteType = useMutation({
    mutationFn: (id: string) => endpoints.deletePropertyType(id),
    onSuccess: () => {
      toast.success('Property type deleted')
      qc.invalidateQueries({ queryKey: ['property-types'] })
      setDeleteConfirm(null)
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  })

  return (
    <div className="space-y-8">
      <motion.div variants={slideUp} initial="hidden" animate="visible" className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Property types</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Room classifications: tenant housing, Bartawi staff housing, service utility, retail, etc.
          </p>
        </div>
        <motion.button onClick={() => setCreating(true)} whileTap={{ scale: 0.97 }}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2">
          <Icon icon={Plus} size={13} /> New type
        </motion.button>
      </motion.div>

      {!data ? (
        <div className="space-y-3">{Array.from({length: 4}).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-xl" />)}</div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="bezel overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_140px_140px_100px_80px] gap-4 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-50">
            <div className="eyebrow w-12"></div>
            <div className="eyebrow">Name</div>
            <div className="eyebrow">Slug</div>
            <div className="eyebrow text-center">Type</div>
            <div className="eyebrow text-center">Rooms</div>
            <div className="eyebrow text-right">Actions</div>
          </div>
          {/* Table Body */}
          <div className="divide-y divide-[color:var(--color-border-subtle)]">
            <AnimatePresence mode="popLayout">
              {data.data.map((pt: any, i: number) => {
                const IconComp = ICON_MAP[pt.icon] || House
                const isEditing = editing === pt.id

                return (
                  <motion.div key={pt.id} variants={staggerItem} layout
                    className={cn(
                      'grid grid-cols-[auto_1fr_140px_140px_100px_80px] gap-4 px-4 py-3 items-center transition-colors',
                      isEditing ? 'bg-amber-50/30' : 'hover:bg-sand-50'
                    )}>
                    <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{ backgroundColor: pt.color + '22', color: pt.color }}>
                      <Icon icon={IconComp} size={16} />
                    </div>
                    {isEditing ? (
                      <EditRow pt={pt} onSave={() => setEditing(null)} onCancel={() => setEditing(null)} />
                    ) : (
                      <>
                        <div>
                          <div className="text-[14px] font-semibold text-espresso">{pt.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {pt.is_residential && <Tag label="Residential" tone="teal" />}
                            {pt.is_leasable && <Tag label="Leasable" tone="amber" />}
                          </div>
                        </div>
                        <div className="font-mono tabular text-[12px] text-espresso-muted">{pt.slug}</div>
                        <div className="text-center text-[12px] text-espresso-muted">
                          {!pt.is_leasable && !pt.is_residential ? 'Service' : '—'}
                        </div>
                        <div className="font-mono tabular text-[12px] text-espresso text-center">
                          {pt.room_count ?? 0}
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <motion.button onClick={() => setEditing(pt.id)} whileTap={{ scale: 0.95 }}
                            className="w-8 h-8 rounded-lg grid place-items-center text-espresso-muted hover:bg-sand-100 transition-colors">
                            <Icon icon={Pencil} size={12} />
                          </motion.button>
                          <motion.button onClick={() => setDeleteConfirm(pt)} whileTap={{ scale: 0.95 }}
                            className="w-8 h-8 rounded-lg grid place-items-center text-rust hover:bg-rust-pale transition-colors">
                            <Icon icon={Trash} size={12} />
                          </motion.button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {creating && <PropertyTypeFormModal onClose={() => setCreating(false)} />}
      {deleteConfirm && <DeleteConfirmDialog pt={deleteConfirm} onConfirm={() => deleteType.mutate(deleteConfirm.id)} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  )
}

function EditRow({ pt, onSave, onCancel }: { pt: any; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(pt.name)
  const [slug, setSlug] = useState(pt.slug)
  const [isResidential, setIsResidential] = useState(pt.is_residential)
  const [isLeasable, setIsLeasable] = useState(pt.is_leasable)
  const qc = useQueryClient()

  const save = useMutation({
    mutationFn: () => endpoints.updatePropertyType(pt.id, { name, slug, is_residential: isResidential, is_leasable: isLeasable, color: pt.color, icon: pt.icon }),
    onSuccess: () => {
      toast.success('Updated')
      qc.invalidateQueries({ queryKey: ['property-types'] })
      onSave()
    },
  })

  return (
    <>
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="col-span-4 grid grid-cols-subgrid gap-4">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="h-9 px-3 bg-white border border-amber-500 rounded-lg text-[13px] focus:outline-none" />
        <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
          className="h-9 px-3 bg-white border border-amber-500 rounded-lg text-[12px] font-mono focus:outline-none" />
        <div className="flex items-center justify-center gap-3 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={isResidential} onChange={e => setIsResidential(e.target.checked)} className="w-3.5 h-3.5 accent-teal" />
            <span className="text-espresso-muted">Res</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={isLeasable} onChange={e => setIsLeasable(e.target.checked)} className="w-3.5 h-3.5 accent-amber-600" />
            <span className="text-espresso-muted">Lease</span>
          </label>
        </div>
        <div className="font-mono tabular text-[12px] text-espresso-muted text-center flex items-center justify-center">
          {pt.room_count ?? 0}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1 justify-end">
        <motion.button onClick={() => save.mutate()} disabled={save.isPending} whileTap={{ scale: 0.95 }}
          className="w-8 h-8 rounded-lg grid place-items-center text-teal hover:bg-teal-pale transition-colors disabled:opacity-50">
          <Icon icon={Check} size={14} emphasis />
        </motion.button>
        <motion.button onClick={onCancel} whileTap={{ scale: 0.95 }}
          className="w-8 h-8 rounded-lg grid place-items-center text-espresso-muted hover:bg-sand-100 transition-colors">
          <Icon icon={X} size={14} />
        </motion.button>
      </motion.div>
    </>
  )
}

function DeleteConfirmDialog({ pt, onConfirm, onCancel }: { pt: any; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog.Root open onOpenChange={o => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50" />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div variants={scaleUp} initial="hidden" animate="visible" exit="exit"
            className="fixed left-1/2 top-[20vh] -translate-x-1/2 w-[440px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden">
            <Dialog.Title className="sr-only">Delete property type</Dialog.Title>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rust-pale grid place-items-center text-rust">
                  <Icon icon={WarningCircle} size={20} />
                </div>
                <div>
                  <div className="display-sm text-espresso">Delete {pt.name}?</div>
                  <div className="text-[13px] text-espresso-muted mt-1">
                    This will permanently remove the property type{pt.room_count > 0 && ` and unassign it from ${pt.room_count} room${pt.room_count === 1 ? '' : 's'}`}.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <motion.button onClick={onCancel} whileTap={{ scale: 0.97 }}
                  className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">
                  Cancel
                </motion.button>
                <motion.button onClick={onConfirm} whileTap={{ scale: 0.97 }}
                  className="px-4 h-9 rounded-full bg-rust text-sand-50 text-[12px] font-medium hover:bg-rust/90 transition-colors">
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Tag({ label, tone }: { label: string; tone: 'teal' | 'amber' | 'neutral' }) {
  const tones = {
    teal: 'bg-teal-pale text-teal',
    amber: 'bg-amber-50 text-amber-600',
    neutral: 'bg-sand-100 text-espresso-muted',
  }
  return <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', tones[tone])}>{label}</span>
}

function PropertyTypeFormModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState('#B8883D')
  const [icon, setIcon] = useState('bed')
  const [isResidential, setIsResidential] = useState(true)
  const [isLeasable, setIsLeasable] = useState(true)

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => endpoints.createPropertyType({ name, slug, color, icon, is_residential: isResidential, is_leasable: isLeasable }),
    onSuccess: () => {
      toast.success('Property type created')
      qc.invalidateQueries({ queryKey: ['property-types'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50" />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div variants={scaleUp} initial="hidden" animate="visible" exit="exit"
            className="fixed left-1/2 top-[12vh] -translate-x-1/2 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden">
            <Dialog.Title className="sr-only">New property type</Dialog.Title>
            <header className="px-6 h-14 border-b border-[color:var(--color-border-subtle)] flex items-center">
              <div className="display-xs">New property type</div>
            </header>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name *"  value={name} onChange={setName} />
                <Field label="Slug *"  value={slug} onChange={setSlug} mono />
                <Field label="Color (hex)"  value={color} onChange={setColor} mono />
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Icon</span>
                  <select value={icon} onChange={e => setIcon(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isResidential} onChange={e => setIsResidential(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                  <div>
                    <div className="text-[13px] font-medium text-espresso">Residential</div>
                    <div className="text-[11px] text-espresso-muted">Counts toward occupancy metrics.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isLeasable} onChange={e => setIsLeasable(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                  <div>
                    <div className="text-[13px] font-medium text-espresso">Leasable</div>
                    <div className="text-[11px] text-espresso-muted">Can be rented to tenants. Service rooms should have this off.</div>
                  </div>
                </label>
              </div>
            </div>
            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <motion.button onClick={onClose} whileTap={{ scale: 0.97 }}
                className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">
                Cancel
              </motion.button>
              <motion.button onClick={() => mutation.mutate()} disabled={!name || !slug || mutation.isPending} whileTap={{ scale: 0.97 }}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all">
                {mutation.isPending ? 'Creating…' : 'Create'}
              </motion.button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className={cn('h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none', mono && 'font-mono tabular')} />
    </label>
  )
}
