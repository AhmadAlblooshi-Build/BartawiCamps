'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatDateTime, cn } from '@/lib/utils'
import { Plus, Wrench } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { MaintIntakeModal } from '@/components/maintenance/MaintIntakeModal'
import { motion } from 'motion/react'
import Link from 'next/link'

export default function MaintenancePage() {
  const [status, setStatus] = useState('open')
  const [intakeOpen, setIntakeOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['maintenance', status],
    queryFn: () => endpoints.maintenance({ ...(status !== 'all' ? { status } : {}), limit: 100 }),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Operations</div>
          <h1 className="display-lg">Maintenance</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Physical repair requests. Auto-routed to teams. Separate from tenant complaints.
          </p>
        </div>
        <button onClick={() => setIntakeOpen(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> New request
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {['open', 'assigned', 'in_progress', 'resolved', 'closed', 'all'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 h-9 rounded-lg text-[11px] font-medium capitalize transition-colors',
              status === s ? 'bg-espresso text-sand-50' : 'bg-sand-100 text-espresso-muted hover:bg-sand-200')}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 skeleton-shimmer rounded-xl" />)}</div>
      ) : data.data.length === 0 ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso">No maintenance requests in this view</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((m: any, i: number) => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="bezel p-4 flex items-start gap-3">
              <PriorityBar priority={m.priority} />
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                <Icon icon={Wrench} size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono tabular text-[11px] text-espresso-subtle">{m.request_number}</span>
                  <span className="font-medium text-[14px] text-espresso">{m.title}</span>
                  <StatusChip status={m.status} />
                </div>
                <div className="text-[12px] text-espresso-soft line-clamp-2">{m.description}</div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-espresso-subtle flex-wrap">
                  {m.room && <span>Room <span className="font-mono tabular text-espresso">{m.room.room_number}</span></span>}
                  {m.assigned_team && <span>Team · <span className="text-espresso">{m.assigned_team.name}</span></span>}
                  {m.assigned_user && <span>Assignee · <span className="text-espresso">{m.assigned_user.full_name}</span></span>}
                  <span>{formatDateTime(m.created_at)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {intakeOpen && <MaintIntakeModal onClose={() => setIntakeOpen(false)} />}
    </div>
  )
}

function PriorityBar({ priority }: { priority: string }) {
  const colors: Record<string, string> = { urgent: 'bg-rust', high: 'bg-ochre', medium: 'bg-amber-400', low: 'bg-sand-400' }
  return <div className={`w-1 self-stretch rounded-full ${colors[priority] || 'bg-sand-300'}`} />
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:        'bg-rust-pale text-rust',
    assigned:    'bg-amber-50 text-amber-600',
    in_progress: 'bg-ochre-pale text-ochre',
    blocked:     'bg-plum-pale text-plum',
    resolved:    'bg-teal-pale text-teal',
    closed:      'bg-sand-100 text-espresso-muted',
    cancelled:   'bg-sand-100 text-espresso-subtle',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${map[status] || map.open}`}>{status.replace('_', ' ')}</span>
}
