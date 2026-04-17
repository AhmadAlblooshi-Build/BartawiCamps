'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import { Plus, Pencil, ShieldStar, User as UserIcon } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'

// 27 permissions grouped into categories
const PERMISSIONS: Record<string, { key: string; label: string }[]> = {
  Rooms:         [{ key: 'rooms:view', label: 'View rooms' }, { key: 'rooms:edit', label: 'Edit rooms' }, { key: 'rooms:admin', label: 'Admin' }],
  Occupancy:     [{ key: 'occupancy:checkin', label: 'Check-in' }, { key: 'occupancy:notice', label: 'Give notice' }, { key: 'occupancy:checkout', label: 'Complete checkout' }],
  Contracts:     [{ key: 'contracts:view', label: 'View' }, { key: 'contracts:renew', label: 'Renew' }, { key: 'contracts:flag_legal', label: 'Flag legal' }, { key: 'contracts:notes', label: 'Manage notes' }],
  Payments:      [{ key: 'payments:view', label: 'View' }, { key: 'payments:log', label: 'Log payment' }, { key: 'payments:refund', label: 'Refund' }],
  Deposits:      [{ key: 'deposits:view', label: 'View' }, { key: 'deposits:collect', label: 'Collect' }, { key: 'deposits:refund', label: 'Refund/forfeit' }],
  Complaints:    [{ key: 'complaints:view', label: 'View' }, { key: 'complaints:resolve', label: 'Resolve' }],
  Maintenance:   [{ key: 'maintenance:view', label: 'View' }, { key: 'maintenance:assign', label: 'Assign' }, { key: 'maintenance:resolve', label: 'Resolve' }],
  Reports:       [{ key: 'reports:view', label: 'View' }, { key: 'reports:export', label: 'Export PDF' }],
  Admin:         [{ key: 'admin:users', label: 'Manage users' }, { key: 'admin:property_types', label: 'Manage types' }, { key: 'admin:teams', label: 'Manage teams' }, { key: 'admin:settings', label: 'System settings' }],
}

export default function UsersPage() {
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => endpoints.users() })
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => endpoints.roles() })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Users & roles</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Manage staff access, permissions, and role assignments.
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> Invite user
        </button>
      </div>

      {/* Roles strip */}
      <div>
        <div className="eyebrow mb-3">Roles</div>
        <div className="flex items-center gap-2 flex-wrap">
          {roles?.data?.map((r: any) => (
            <div key={r.id} className="bezel px-4 py-2 flex items-center gap-2">
              <Icon icon={ShieldStar} size={12} className="text-amber-600" />
              <span className="text-[12px] font-medium text-espresso">{r.name}</span>
              <span className="text-[10px] font-mono tabular text-espresso-subtle">· {r.permissions?.length || 0} perms</span>
              <span className="text-[10px] font-mono tabular text-espresso-subtle">· {r.user_count || 0} users</span>
            </div>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div>
        <div className="eyebrow mb-3">Users</div>
        {!users ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-lg" />)}</div>
        ) : (
          <div className="bezel overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_180px_140px_120px] gap-0 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-50">
              <div className="eyebrow">User</div>
              <div className="eyebrow">Email</div>
              <div className="eyebrow">Role</div>
              <div className="eyebrow">Last login</div>
              <div className="eyebrow text-right">Actions</div>
            </div>
            <div className="divide-y divide-[color:var(--color-border-subtle)]">
              {users.data.map((u: any, i: number) => (
                <motion.div key={u.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_1fr_180px_140px_120px] gap-0 px-4 py-3 items-center hover:bg-sand-50 transition-colors">
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
                  <div className="text-[12px] text-espresso">{u.role?.name || '—'}</div>
                  <div className="text-[11px] text-espresso-subtle">{u.last_login_at ? formatRelative(u.last_login_at) : 'Never'}</div>
                  <div className="text-right">
                    <button onClick={() => setEditing(u)}
                      className="w-7 h-7 rounded-md grid place-items-center text-espresso-muted hover:bg-sand-100 transition-colors">
                      <Icon icon={Pencil} size={11} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <UserFormModal initial={editing} roles={roles?.data || []} onClose={() => { setEditing(null); setCreating(false) }} />
      )}
    </div>
  )
}

function UserFormModal({ initial, roles, onClose }: { initial: any | null; roles: any[]; onClose: () => void }) {
  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [roleId, setRoleId] = useState(initial?.role_id || roles[0]?.id || '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [customPerms, setCustomPerms] = useState<string[]>(initial?.custom_permissions || [])
  const [showCustom, setShowCustom] = useState(false)

  const qc = useQueryClient()
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

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed left-1/2 top-[8vh] -translate-x-1/2 w-[640px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden flex flex-col"
          >
            <Dialog.Title className="sr-only">{initial ? 'Edit user' : 'Invite user'}</Dialog.Title>
            <header className="px-6 h-14 border-b border-[color:var(--color-border-subtle)] flex items-center">
              <div className="display-xs">{initial ? 'Edit user' : 'Invite user'}</div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-[13px] text-espresso">Account active</span>
                  </label>
                )}
              </div>

              {initial && (
                <div>
                  <button onClick={() => setShowCustom(v => !v)}
                    className="eyebrow hover:text-espresso transition-colors">
                    {showCustom ? '− Hide' : '+ Override'} permissions
                  </button>
                  {showCustom && (
                    <div className="mt-3 bezel p-4 space-y-4">
                      <div className="text-[11px] text-espresso-muted">
                        Custom permissions are added on top of the role's default permissions. Leave empty to use role defaults.
                      </div>
                      {Object.entries(PERMISSIONS).map(([group, perms]) => (
                        <div key={group}>
                          <div className="eyebrow mb-2">{group}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map(p => (
                              <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[12px]">
                                <input type="checkbox" checked={customPerms.includes(p.key)} onChange={() => togglePerm(p.key)}
                                  className="w-3.5 h-3.5 accent-amber-500" />
                                <span>{p.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!fullName || !email || !roleId || mutation.isPending}
                className="px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all">
                {mutation.isPending ? 'Saving…' : (initial ? 'Save' : 'Send invite')}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
