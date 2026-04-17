'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatDateTime, cn } from '@/lib/utils'
import { Plus } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { ComplaintIntakeModal } from '@/components/complaints/ComplaintIntakeModal'
import { motion } from 'motion/react'

export default function ComplaintsPage() {
  const [status, setStatus] = useState<string>('open')
  const [intakeOpen, setIntakeOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['complaints', status],
    queryFn: () => endpoints.complaints({ ...(status !== 'all' ? { status } : {}), limit: 100 }),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Tenant issues</div>
          <h1 className="display-lg">Complaints</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Tenant-reported complaints. AI auto-classifies into categories. Maintenance goes to the Maintenance section.
          </p>
        </div>
        <button onClick={() => setIntakeOpen(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> Log complaint
        </button>
      </div>

      <div className="flex items-center gap-1">
        {['open', 'in_progress', 'resolved', 'all'].map(s => (
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
          <div className="text-[13px] font-medium text-espresso">No complaints in this view</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((c: any, i: number) => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              className="bezel p-4">
              <div className="flex items-start gap-3">
                <PriorityDot priority={c.priority} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-[14px] text-espresso">{c.title}</span>
                    <StatusChip status={c.status} />
                    {c.category && <span className="text-[10px] font-medium uppercase tracking-wide text-espresso-muted">· {c.category.name}</span>}
                  </div>
                  <div className="text-[12px] text-espresso-soft line-clamp-2">{c.description}</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-espresso-subtle">
                    {c.room && <span>Room <span className="font-mono tabular text-espresso">{c.room.room_number}</span></span>}
                    <span>{formatDateTime(c.created_at)}</span>
                    {c.assigned_user && <span>Assigned · {c.assigned_user.full_name}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {intakeOpen && <ComplaintIntakeModal onClose={() => setIntakeOpen(false)} />}
    </div>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { urgent: 'bg-rust', high: 'bg-ochre', medium: 'bg-amber-400', low: 'bg-sand-400' }
  return <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${colors[priority] || 'bg-sand-300'}`} title={priority} />
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:        'bg-rust-pale text-rust',
    in_progress: 'bg-ochre-pale text-ochre',
    resolved:    'bg-teal-pale text-teal',
    closed:      'bg-sand-100 text-espresso-muted',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${map[status] || map.open}`}>{status.replace('_', ' ')}</span>
}
