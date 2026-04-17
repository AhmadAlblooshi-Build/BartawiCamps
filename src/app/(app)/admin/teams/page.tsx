'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Users, Crown, Trash } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

export default function TeamsPage() {
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => endpoints.teams() })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => endpoints.users() })
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  const create = useMutation({
    mutationFn: () => endpoints.createTeam({ name: newName, slug: newSlug }),
    onSuccess: () => {
      toast.success('Team created')
      qc.invalidateQueries({ queryKey: ['teams'] })
      setCreating(false); setNewName(''); setNewSlug('')
    },
  })

  const addMember = useMutation({
    mutationFn: ({ teamId, userId, isLead }: any) => endpoints.addTeamMember(teamId, { user_id: userId, is_lead: isLead }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })

  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }: any) => endpoints.removeTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Teams</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Maintenance and operations teams. Complaints and maintenance requests route to the assigned team automatically.
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> New team
        </button>
      </div>

      {creating && (
        <div className="bezel p-4 flex items-end gap-3">
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Team name</span>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Plumbing"
              className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none" />
          </label>
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Slug</span>
            <input type="text" value={newSlug} onChange={e => setNewSlug(e.target.value)}
              placeholder="plumbing"
              className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
          </label>
          <button onClick={() => create.mutate()} disabled={!newName || !newSlug}
            className="h-10 px-4 rounded-lg bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50">
            Create
          </button>
          <button onClick={() => setCreating(false)} className="h-10 px-3 text-[12px] text-espresso-muted">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams?.data?.map((team: any, i: number) => (
          <motion.div key={team.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="bezel p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
                <Icon icon={Users} size={16} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-espresso">{team.name}</div>
                <div className="font-mono tabular text-[10px] text-espresso-subtle mt-0.5">{team.slug}</div>
              </div>
            </div>
            <div className="eyebrow mb-2">Members · {team.members?.length || 0}</div>
            <div className="space-y-1 mb-3">
              {team.members?.map((m: any) => (
                <div key={m.user_id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-sand-50 transition-colors group">
                  <div className="flex items-center gap-2">
                    {m.is_lead && <Icon icon={Crown} size={11} className="text-amber-600" />}
                    <span className="text-[12px] text-espresso">{m.user?.full_name || m.user?.email}</span>
                    {m.is_lead && <span className="text-[9px] font-medium text-amber-600 uppercase tracking-wide">Lead</span>}
                  </div>
                  <button onClick={() => removeMember.mutate({ teamId: team.id, userId: m.user_id })}
                    className="opacity-0 group-hover:opacity-100 text-rust hover:text-rust/80 transition-opacity">
                    <Icon icon={Trash} size={11} />
                  </button>
                </div>
              ))}
            </div>
            <AddMemberBar users={users?.data ?? []} existing={team.members ?? []}
              onAdd={(userId, isLead) => addMember.mutate({ teamId: team.id, userId, isLead })} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function AddMemberBar({ users, existing, onAdd }: { users: any[]; existing: any[]; onAdd: (userId: string, isLead: boolean) => void }) {
  const [userId, setUserId] = useState('')
  const [isLead, setIsLead] = useState(false)
  const availableUsers = users.filter(u => !existing.find((m: any) => m.user_id === u.id))
  return (
    <div className="pt-3 border-t border-[color:var(--color-border-subtle)] flex items-center gap-2">
      <select value={userId} onChange={e => setUserId(e.target.value)}
        className="flex-1 h-9 px-2 bg-sand-50 border border-[color:var(--color-border-subtle)] rounded text-[12px] focus:border-amber-500 focus:outline-none">
        <option value="">Add member...</option>
        {availableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
      </select>
      <label className="flex items-center gap-1 cursor-pointer text-[11px] text-espresso-muted">
        <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
        Lead
      </label>
      <button onClick={() => { if (userId) { onAdd(userId, isLead); setUserId(''); setIsLead(false) } }}
        disabled={!userId}
        className="h-9 px-3 rounded bg-espresso text-sand-50 text-[11px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-colors">
        Add
      </button>
    </div>
  )
}
