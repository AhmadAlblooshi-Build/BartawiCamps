import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-bg-elevated border border-border mb-4">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="font-heading text-lg text-text-secondary mb-1">{title}</h3>
      {description && <p className="text-text-muted text-sm max-w-xs">{description}</p>}
    </div>
  )
}
