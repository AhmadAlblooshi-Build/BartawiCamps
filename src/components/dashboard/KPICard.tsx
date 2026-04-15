import { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  highlight?: boolean
  loading?: boolean
}

export function KPICard({ label, value, sub, icon: Icon, trend, highlight, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  return (
    <div className={cn(
      'relative bg-bg-card border rounded-xl p-5 overflow-hidden transition-all duration-200 hover:border-border-light group',
      highlight ? 'border-status-vacant/50 bg-status-vacant-dim' : 'border-border'
    )}>
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-accent-cyan/3 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between mb-3">
        <p className="text-text-muted text-xs font-body font-medium uppercase tracking-wider">{label}</p>
        <div className={cn(
          'p-2 rounded-lg',
          highlight ? 'bg-status-vacant-dim' : 'bg-bg-elevated'
        )}>
          <Icon className={cn(
            'w-4 h-4',
            highlight ? 'text-status-vacant' : 'text-text-muted'
          )} />
        </div>
      </div>

      <p className={cn(
        'font-heading font-bold text-2xl mb-1',
        highlight ? 'text-status-vacant' : 'text-text-primary'
      )}>
        {value}
      </p>

      {sub && (
        <p className={cn(
          'text-xs font-body',
          trend === 'up' ? 'text-status-occupied' :
          trend === 'down' ? 'text-status-vacant' :
          'text-text-muted'
        )}>
          {sub}
        </p>
      )}
    </div>
  )
}
