'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import { Plus, Pencil, ShieldStar, User as UserIcon, CaretDown, WarningCircle } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { scaleUp, slideUp, staggerContainer, staggerItem } from '@/lib/motion'

// 27 permissions grouped into 9 categories
const PERMISSIONS: Record<string, { key: string; label: string; description: string }[]> = {
  Rooms:         [
    { key: 'rooms:view', label: 'View rooms', description: 'View all room information' },
    { key: 'rooms:edit', label: 'Edit rooms', description: 'Modify room details and assignments' },
    { key: 'rooms:admin', label: 'Admin', description: 'Full administrative access to rooms' }
  ],
  Occupancy:     [
    { key: 'occupancy:checkin', label: 'Check-in', description: 'Create new leases and check in tenants' },
    { key: 'occupancy:notice', label: 'Give notice', description: 'Record notice to vacate' },
    { key: 'occupancy:checkout', label: 'Complete checkout', description: 'Process final checkout and settlements' }
  ],
  Contracts:     [
    { key: 'contracts:view', label: 'View', description: 'View contract details' },
    { key: 'contracts:renew', label: 'Renew', description: 'Renew existing contracts' },
    { key: 'contracts:flag_legal', label: 'Flag legal', description: 'Mark contracts for legal review' },
    { key: 'contracts:notes', label: 'Manage notes', description: 'Add and edit contract notes' }
  ],
  Payments:      [
    { key: 'payments:view', label: 'View', description: 'View payment history' },
    { key: 'payments:log', label: 'Log payment', description: 'Record new payments' },
    { key: 'payments:refund', label: 'Refund', description: 'Process payment refunds' }
  ],
  Deposits:      [
    { key: 'deposits:view', label: 'View', description: 'View deposit information' },
    { key: 'deposits:collect', label: 'Collect', description: 'Collect security deposits' },
    { key: 'deposits:refund', label: 'Refund/forfeit', description: 'Process deposit refunds or forfeits' }
  ],
  Complaints:    [
    { key: 'complaints:view', label: 'View', description: 'View complaints and issues' },
    { key: 'complaints:resolve', label: 'Resolve', description: 'Mark complaints as resolved' }
  ],
  Maintenance:   [
    { key: 'maintenance:view', label: 'View', description: 'View maintenance requests' },
    { key: 'maintenance:assign', label: 'Assign', description: 'Assign requests to teams' },
    { key: 'maintenance:resolve', label: 'Resolve', description: 'Mark requests as complete' }
  ],
  Reports:       [
    { key: 'reports:view', label: 'View', description: 'Access reporting dashboard' },
    { key: 'reports:export', label: 'Export PDF', description: 'Generate and download PDF reports' }
  ],
  Admin:         [
    { key: 'admin:users', label: 'Manage users', description: 'Create and manage user accounts' },
    { key: 'admin:property_types', label: 'Manage types', description: 'Manage property type classifications' },
    { key: 'admin:teams', label: 'Manage teams', description: 'Create and manage teams' },
    { key: 'admin:settings', label: 'System settings', description: 'Access system configuration' }
  ],
}

export default function UsersPage() {
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => endpoints.users() })
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => endpoints.roles() })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
      className="atmosphere space-y-8">
      <motion.div variants={slideUp} initial="hidden" animate="visible" className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Users & roles</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Manage staff access, permissions, and role assignments.
          </p>
        </div>
        <motion.button onClick={() => setCreating(true)} whileTap={{ scale: 0.97 }}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2">
          <Icon icon={Plus} size={13} /> Invite user
        </motion.button>
      </motion.div>

      {/* Roles strip */}
      <motion.div variants={slideUp} initial="hidden" animate="visible">
        <div className="eyebrow mb-3">Roles</div>
        <div className="flex items-center gap-2 flex-wrap">
          {roles?.data?.map((r: any) => (
            <motion.div key={r.id} whileHover={{ y: -1 }} className="bezel elevation-hover px-4 py-2 flex items-center gap-2">
              <Icon icon={ShieldStar} size={12} className="text-amber-600" />
              <span className="text-[12px] font-medium text-espresso">{r.name}</span>
              <span className="text-[10px] font-mono tabular text-espresso-subtle">· {r.permissions?.length || 0} perms</span>
              <span className="text-[10px] font-mono tabular text-espresso-subtle">· {r.user_count || 0} users</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Users list */}
      <div>
        <div className="eyebrow mb-3">Users</div>
        {!users ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-lg" />)}</div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="bezel overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_180px_140px_120px] gap-0 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-100">
              <div className="eyebrow">User</div>
              <div className="eyebrow">Email</div>
              <div className="eyebrow">Role</div>
              <div className="eyebrow">Last login</div>
              <div className="eyebrow text-right">Actions</div>
            </div>
            <div className="divide-y divide-[color:var(--color-border-subtle)]">
              {users.data.map((u: any, i: number) => (
                <motion.div key={u.id} variants={staggerItem}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_180px_140px_120px] gap-0 px-4 py-3 items-center transition-all duration-200',
                    i % 2 === 0 ? 'bg-transparent' : 'bg-sand-100/15',
                    'hover:bg-sand-200/30 hover:-translate-y-[1px]'
                  )}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-espresso text-sand-50 grid place-items-center text-[11px] font-semibold">
                      {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-espresso">{u.full_name || '—'}</div>
                      {u.is_active ? <span className="text-[10px] text-teal">Active</span> : <span className="text-[10px] text-espresso-subtle">Disabled</span>}
                    </div>
                  </div>
                  <div className="text-[12px] text-espresso-muted font-mono tabular truncate pr-3">{u.email}</div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-medium">
                      <Icon icon={ShieldStar} size={10} />
                      {u.role?.name || '—'}
                    </span>
                  </div>
                  <div className="text-[11px] text-espresso-subtle">{u.last_login_at ? formatRelative(u.last_login_at) : 'Never'}</div>
                  <div className="text-right">
                    <motion.button onClick={() => setEditing(u)} whileTap={{ scale: 0.95 }}
                      className="w-7 h-7 rounded-md grid place-items-center text-espresso-muted hover:bg-sand-100 transition-colors">
                      <Icon icon={Pencil} size={11} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {(creating || editing) && (
        <InviteUserModal initial={editing} roles={roles?.data || []} onClose={() => { setEditing(null); setCreating(false) }} />
      )}
    </motion.div>
  )
}

function InviteUserModal({ initial, roles, onClose }: { initial: any | null; roles: any[]; onClose: () => void }) {
  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [roleId, setRoleId] = useState(initial?.role_id || roles[0]?.id || '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [customPerms, setCustomPerms] = useState<string[]>(initial?.custom_permissions || [])
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const qc = useQueryClient()
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => endpoints.me() })

  const mutation = useMutation({
    mutationFn: () => initial
      ? endpoints.updateUser(initial.id, { full_name: fullName, role_id: roleId, is_active: isActive, custom_permissions: customPerms })
      : endpoints.inviteUser({ email, full_name: fullName, role_id: roleId }),
    onSuccess: () => {
      toast.success(initial ? 'User updated' : 'Invitation sent')
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed'),
  })

  const togglePerm = (key: string) => setCustomPerms(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key])
  const toggleCategory = (cat: string) => setExpandedCategories(c => c.includes(cat) ? c.filter(x => x !== cat) : [...c, cat])

  const countSelected = (cat: string) => PERMISSIONS[cat].filter(p => customPerms.includes(p.key)).length
  const isSelf = initial && currentUser?.id === initial.id

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50" />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div variants={scaleUp} initial="hidden" animate="visible" exit="exit"
            className="fixed left-1/2 top-[8vh] -translate-x-1/2 w-[720px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden flex flex-col">
            <Dialog.Title className="sr-only">{initial ? 'Edit user' : 'Invite user'}</Dialog.Title>
            <header className="px-6 h-14 border-b border-[color:var(--color-border-subtle)] flex items-center shrink-0">
              <div className="display-xs">{initial ? 'Edit user' : 'Invite user'}</div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Full name *</span>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Email *</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={Boolean(initial)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none disabled:bg-sand-50 disabled:text-espresso-muted" />
                </label>
                <label className="flex flex-col gap-1.5 col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Role *</span>
                  <select value={roleId} onChange={e => setRoleId(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                {initial && (
                  <label className="col-span-2 flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                      disabled={isSelf}
                      className="w-4 h-4 accent-amber-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <div>
                      <span className="text-[13px] text-espresso">Account active</span>
                      {isSelf && <span className="text-[11px] text-espresso-muted ml-2">(Can't deactivate yourself)</span>}
                    </div>
                  </label>
                )}
              </div>

              {/* Permission override section */}
              {initial && (
                <div className="pt-3 border-t border-[color:var(--color-border-subtle)]">
                  <div className="eyebrow mb-3">Override permissions (optional)</div>
                  <div className="text-[11px] text-espresso-muted mb-4">
                    Custom permissions are added on top of the role's default permissions. Leave empty to use role defaults.
                  </div>
                  <div className="space-y-2">
                    {Object.entries(PERMISSIONS).map(([category, perms]) => {
                      const isExpanded = expandedCategories.includes(category)
                      const selected = countSelected(category)
                      return (
                        <div key={category} className="bezel elevation-hover overflow-hidden">
                          <motion.button onClick={() => toggleCategory(category)} whileTap={{ scale: 0.995 }}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-sand-50 transition-all duration-200">
                            <div className="flex items-center gap-2">
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                                <Icon icon={CaretDown} size={12} className="text-espresso-muted" />
                              </motion.div>
                              <span className="text-[13px] font-medium text-espresso">{category}</span>
                              {selected > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal text-white text-[10px] font-medium">
                                  {selected}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-espresso-muted">{perms.length} permissions</span>
                          </motion.button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="overflow-hidden border-t border-[color:var(--color-border-subtle)]">
                                <div className="px-4 py-3 space-y-3 bg-sand-50">
                                  {perms.map(p => (
                                    <label key={p.key} className="flex items-start gap-3 cursor-pointer group">
                                      <div className="relative flex items-center h-5">
                                        <input type="checkbox" checked={customPerms.includes(p.key)} onChange={() => togglePerm(p.key)}
                                          className="w-4 h-4 accent-teal cursor-pointer" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-medium text-espresso group-hover:text-teal transition-colors">{p.label}</div>
                                        <div className="text-[11px] text-espresso-muted mt-0.5">{p.description}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2 shrink-0">
              <motion.button onClick={onClose} whileTap={{ scale: 0.97 }}
                className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">
                Cancel
              </motion.button>
              <motion.button onClick={() => mutation.mutate()} disabled={!fullName || !email || !roleId || mutation.isPending} whileTap={{ scale: 0.97 }}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all">
                {mutation.isPending ? 'Saving…' : (initial ? 'Save' : 'Send invite')}
              </motion.button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
