'use client'
import { useState } from 'react'
import { useCamps, useComplaints } from '@/lib/queries'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, getPriorityColor } from '@/lib/utils'
import { MessageSquareWarning, AlertTriangle } from 'lucide-react'
import type { Complaint, ComplaintStatus } from '@/lib/types'

const COLUMNS: { status: ComplaintStatus; label: string; color: string }[] = [
  { status: 'open',        label: 'Open',        color: 'border-accent-cyan/30 bg-accent-glow' },
  { status: 'in_progress', label: 'In Progress',  color: 'border-yellow-500/30 bg-yellow-500/5' },
  { status: 'resolved',    label: 'Resolved',    color: 'border-status-occupied/30 bg-status-occupied-dim' },
  { status: 'closed',      label: 'Closed',      color: 'border-border bg-bg-elevated' },
]

export default function ComplaintsPage() {
  const { data: camps } = useCamps()
  const [campFilter, setCampFilter] = useState('all')
  const { data: complaintData, isLoading } = useComplaints({
    campId: campFilter !== 'all' ? campFilter : undefined,
  })

  const complaints = complaintData?.data ?? []

  const byStatus = (status: ComplaintStatus) =>
    complaints.filter(c => c.status === status)

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Complaints</h1>
          <p className="text-text-muted text-sm mt-0.5">{complaints.length} total complaints</p>
        </div>
        <select
          value={campFilter}
          onChange={(e) => setCampFilter(e.target.value)}
          className="px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-secondary focus:outline-none"
        >
          <option value="all">All Camps</option>
          {camps?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(({ status, label, color }) => {
          const items = byStatus(status)
          return (
            <div key={status} className="space-y-3">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${color}`}>
                <span className="font-heading font-semibold text-sm text-text-primary">{label}</span>
                <span className="font-mono text-xs text-text-muted">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {items.length === 0 ? (
                  <div className="py-6 text-center text-text-dim text-xs font-body">No items</div>
                ) : (
                  items.map(c => <ComplaintCard key={c.id} complaint={c} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 hover:border-border-light transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-body text-sm text-text-primary font-medium leading-snug">{complaint.title}</p>
        <span className={`text-xs ${getPriorityColor(complaint.priority)}`}>
          {complaint.priority === 'urgent' && <AlertTriangle className="w-3 h-3" />}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={complaint.priority} />
        {complaint.reported_by_room && (
          <span className="font-mono text-[10px] text-text-dim">{complaint.reported_by_room}</span>
        )}
      </div>
      <p className="text-text-dim text-[10px] font-body mt-2">
        {formatDate(complaint.created_at)} · {complaint.complaint_ref}
      </p>
    </div>
  )
}
