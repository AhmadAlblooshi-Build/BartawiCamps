'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash, House, Bed, Wrench, Storefront, Buildings } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'

const ICON_MAP: Record<string, any> = {
  house: House, bed: Bed, wrench: Wrench, storefront: Storefront, buildings: Buildings,
}

export default function PropertyTypesPage() {
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const { data } = useQuery({ queryKey: ['property-types'], queryFn: () => endpoints.propertyTypes() })
  const qc = useQueryClient()

  const deleteType = useMutation({
    mutationFn: (id: string) => endpoints.deletePropertyType(id),
    onSuccess: () => {
      toast.success('Property type deleted')
      qc.invalidateQueries({ queryKey: ['property-types'] })
    },
    onError: (err: any) => toast.error(err.message || 'Delete failed'),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Property types</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Room classifications: tenant housing, Bartawi staff housing, service utility, retail, etc.
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> New type
        </button>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length: 4}).map((_, i) => <div key={i} className="h-32 skeleton-shimmer rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.data.map((pt: any, i: number) => {
            const IconComp = ICON_MAP[pt.icon] || House
            return (
              <motion.div key={pt.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="bezel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{ backgroundColor: pt.color + '22', color: pt.color }}>
                      <Icon icon={IconComp} size={16} />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-espresso">{pt.name}</div>
                      <div className="font-mono tabular text-[10px] text-espresso-subtle mt-0.5">{pt.slug}</div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {pt.is_residential && <Tag label="Residential" tone="teal" />}
                        {pt.is_leasable && <Tag label="Leasable" tone="amber" />}
                        {!pt.is_leasable && !pt.is_residential && <Tag label="Service" tone="neutral" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(pt)}
                      className="w-8 h-8 rounded-lg grid place-items-center text-espresso-muted hover:bg-sand-100 transition-colors">
                      <Icon icon={Pencil} size={12} />
                    </button>
                    <button onClick={() => { if (confirm(`Delete ${pt.name}?`)) deleteType.mutate(pt.id) }}
                      className="w-8 h-8 rounded-lg grid place-items-center text-rust hover:bg-rust-pale transition-colors">
                      <Icon icon={Trash} size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-espresso-muted mt-3">
                  {pt.room_count ?? 0} rooms
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <PropertyTypeFormModal initial={editing} onClose={() => { setEditing(null); setCreating(false) }} />
      )}
    </div>
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

function PropertyTypeFormModal({ initial, onClose }: { initial: any | null; onClose: () => void }) {
  const [name, setName] = useState(initial?.name || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [color, setColor] = useState(initial?.color || '#B8883D')
  const [icon, setIcon] = useState(initial?.icon || 'bed')
  const [isResidential, setIsResidential] = useState(initial?.is_residential ?? true)
  const [isLeasable, setIsLeasable] = useState(initial?.is_leasable ?? true)

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => initial
      ? endpoints.updatePropertyType(initial.id, { name, slug, color, icon, is_residential: isResidential, is_leasable: isLeasable })
      : endpoints.createPropertyType({ name, slug, color, icon, is_residential: isResidential, is_leasable: isLeasable }),
    onSuccess: () => {
      toast.success(initial ? 'Updated' : 'Created')
      qc.invalidateQueries({ queryKey: ['property-types'] })
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
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-[12vh] -translate-x-1/2 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">{initial ? 'Edit' : 'New'} property type</Dialog.Title>
            <header className="px-6 h-14 border-b border-[color:var(--color-border-subtle)] flex items-center">
              <div className="display-xs">{initial ? 'Edit property type' : 'New property type'}</div>
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
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!name || !slug || mutation.isPending}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all">
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
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
