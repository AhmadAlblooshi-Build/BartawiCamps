import { getStatusBg, getStatusLabel } from '@/lib/utils'

interface Props {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  return (
    <span className={`
      inline-flex items-center font-body font-medium rounded-full
      ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      ${getStatusBg(status)}
    `}>
      {getStatusLabel(status)}
    </span>
  )
}
