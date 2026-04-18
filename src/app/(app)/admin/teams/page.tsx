'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Users, Crown, Trash, X, UserPlus } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { scaleUp, slideUp, staggerContainer, staggerItem } from '@/lib/motion'

export default function TeamsPage() {
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => endpoints.teams() })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => endpoints.users() })
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<string[]>([])

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
    onSuccess: () => {
      toast.success('Member added')
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }: any) => endpoints.removeTeamMember(teamId, userId),
    onSuccess: () => {
      toast.success('Member removed')
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const toggleExpanded = (teamId: string) => {
    setExpandedTeams(current =>
      current.includes(teamId) ? current.filter(id => id !== teamId) : [...current, teamId]
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
      className="atmosphere space-y-8">
      <motion.div variants={slideUp} initial="hidden" animate="visible" className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="display-lg">Teams</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Maintenance and operations teams. Complaints and maintenance requests route to the assigned team automatically.
          </p>
        </div>
        <motion.button onClick={() => setCreating(true)} whileTap={{ scale: 0.97 }}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2">
          <Icon icon={Plus} size={13} /> New team
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bezel elevation-hover p-4 flex items-end gap-3 overflow-hidden">
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
            <motion.button onClick={() => create.mutate()} disabled={!newName || !newSlug} whileTap={{ scale: 0.97 }}
              className="h-10 px-4 rounded-lg bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50">
              Create
            </motion.button>
            <motion.button onClick={() => setCreating(false)} whileTap={{ scale: 0.97 }}
              className="h-10 px-3 text-[12px] text-espresso-muted hover:text-espresso">
              Cancel
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams?.data?.map((team: any, i: number) => {
          const isExpanded = expandedTeams.includes(team.id)
          const lead = team.members?.find((m: any) => m.is_lead)
          return (
            <motion.div key={team.id} variants={staggerItem} layout
              className="bezel elevation-hover overflow-hidden">
              <motion.div
                className="p-5 cursor-pointer hover:bg-sand-50 transition-all duration-200"
                onClick={() => toggleExpanded(team.id)}
                whileTap={{ scale: 0.995 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                      <Icon icon={Users} size={16} />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-espresso">{team.name}</div>
                      <div className="font-mono tabular text-[10px] text-espresso-subtle mt-0.5">{team.slug}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono tabular text-espresso-muted">
                      {team.members?.length || 0} member{team.members?.length === 1 ? '' : 's'}
                    </div>
                    {lead && (
                      <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1 justify-end">
                        <Icon icon={Crown} size={10} />
                        Lead: {lead.user?.full_name?.split(' ')[0] || lead.user?.email.split('@')[0]}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden border-t border-[color:var(--color-border-subtle)]">
                    <div className="p-4 bg-sand-50 space-y-3">
                      <div className="eyebrow">Members</div>
                      {team.members && team.members.length > 0 ? (
                        <div className="space-y-1">
                          {team.members.map((m: any) => (
                            <motion.div key={m.user_id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              className="flex items-center justify-between px-3 py-2 rounded bg-white hover:bg-sand-50 transition-colors group">
                              <div className="flex items-center gap-2">
                                {m.is_lead && <Icon icon={Crown} size={12} className="text-amber-600" />}
                                <span className="text-[12px] text-espresso">{m.user?.full_name || m.user?.email}</span>
                                {m.is_lead && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-amber-600 bg-amber-50 uppercase tracking-wide">Lead</span>}
                              </div>
                              <motion.button
                                onClick={() => removeMember.mutate({ teamId: team.id, userId: m.user_id })}
                                whileTap={{ scale: 0.9 }}
                                className="opacity-0 group-hover:opacity-100 text-rust hover:text-rust/80 transition-all">
                                <Icon icon={Trash} size={12} />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-espresso-muted italic py-2">No members yet</div>
                      )}
                      <AddMemberBar users={users?.data ?? []} existing={team.members ?? []}
                        onAdd={(userId, isLead) => addMember.mutate({ teamId: team.id, userId, isLead })} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

function AddMemberBar({ users, existing, onAdd }: { users: any[]; existing: any[]; onAdd: (userId: string, isLead: boolean) => void }) {
  const [userId, setUserId] = useState('')
  const [isLead, setIsLead] = useState(false)
  const availableUsers = users.filter(u => !existing.find((m: any) => m.user_id === u.id))

  const handleAdd = () => {
    if (userId) {
      onAdd(userId, isLead)
      setUserId('')
      setIsLead(false)
    }
  }

  return (
    <div className="pt-3 border-t border-[color:var(--color-border-subtle)] flex items-center gap-2">
      <select value={userId} onChange={e => setUserId(e.target.value)}
        className="flex-1 h-9 px-3 bg-white border border-[color:var(--color-border-medium)] rounded text-[12px] focus:border-amber-500 focus:outline-none">
        <option value="">Add member...</option>
        {availableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
      </select>
      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-espresso-muted px-2 py-1 rounded hover:bg-sand-100 transition-colors">
        <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
        <Icon icon={Crown} size={11} className="text-amber-600" />
        Lead
      </label>
      <motion.button onClick={handleAdd} disabled={!userId} whileTap={{ scale: 0.97 }}
        className="h-9 px-3 rounded bg-espresso text-sand-50 text-[11px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-colors flex items-center gap-1.5">
        <Icon icon={UserPlus} size={13} />
        Add
      </motion.button>
    </div>
  )
}
