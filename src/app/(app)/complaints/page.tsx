'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatDateTime, cn } from '@/lib/utils'
import { Plus } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { ComplaintIntakeModal } from '@/components/complaints/ComplaintIntakeModal'
import { motion } from 'motion/react'
import { fadeIn, slideUp } from '@/lib/motion'

export default function ComplaintsPage() {
  const [status, setStatus] = useState<string>('open')
  const [intakeOpen, setIntakeOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['complaints', status],
    queryFn: () => endpoints.complaints({ ...(status !== 'all' ? { status } : {}), limit: 100 }),
  })

  return (
    <div className="space-y-8 atmosphere">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <h1 className="display-lg">Complaints</h1>
          <p className="overline mt-2">
            Tenant-reported complaints · AI auto-classifies into categories
          </p>
        </div>
        <button onClick={() => setIntakeOpen(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> Log complaint
        </button>
      </div>

      {/* Filter pills - evolved styling */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 h-9 rounded-lg text-[11px] font-medium capitalize transition-colors',
              status === s ? 'text-amber' : 'bg-sand-200 text-espresso-muted hover:bg-sand-200')}
            style={status === s ? { background: 'rgba(184, 136, 61, 0.1)' } : {}}>
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
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          {data.data.map((c: any, i: number) => {
            const priorityColors: Record<string, string> = {
              urgent: '#A84A3B',
              high: '#C48A1E',
              medium: '#B8883D',
              low: '#1E4D52'
            }
            const priorityColor = priorityColors[c.priority] || '#D6CFC5'

            return (
              <motion.div key={c.id}
                variants={slideUp}
                transition={{ delay: Math.min(i * 0.04, 0.32) }}
                className="bezel elevation-hover p-4"
                style={{ borderLeft: `3px solid ${priorityColor}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="display-sm">{c.title}</span>
                      <StatusChip status={c.status} />
                      {c.category && <span className="overline text-espresso-muted">· {c.category.name}</span>}
                    </div>
                    <div className="text-[12px] text-espresso-soft line-clamp-2">{c.description}</div>
                    <div className="flex items-center gap-3 mt-2">
                      {c.room && <span className="overline">Room <span className="font-mono tabular text-espresso">{c.room.room_number}</span></span>}
                      <span className="overline">{formatDateTime(c.created_at)}</span>
                      {c.assigned_user && <span className="overline">Assigned · {c.assigned_user.full_name}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {intakeOpen && <ComplaintIntakeModal onClose={() => setIntakeOpen(false)} />}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:        'bg-rust-pale text-rust',
    in_progress: 'bg-ochre-pale text-ochre',
    resolved:    'bg-teal-pale text-teal',
    closed:      'bg-sand-100 text-espresso-muted',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase ${map[status] || map.open}`}>{status.replace('_', ' ')}</span>
}
