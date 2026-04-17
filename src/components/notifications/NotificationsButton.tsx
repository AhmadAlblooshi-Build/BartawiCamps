'use client'
import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { Bell } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { NotificationsPanel } from './NotificationsPanel'

export function NotificationsButton() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => endpoints.notifications(),
    refetchInterval: 60_000,
  })
  const unread = data?.unread_count ?? 0

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="relative w-9 h-9 rounded-lg grid place-items-center hover:bg-sand-100 transition-colors" aria-label={`${unread} unread notifications`}>
          <Icon icon={Bell} size={18} emphasis={unread > 0} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rust text-white text-[9px] font-semibold flex items-center justify-center tabular font-mono">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8}
          className="w-[420px] max-h-[70vh] bg-white rounded-xl shadow-raise-4 z-50 animate-fade overflow-hidden border border-[color:var(--color-border-subtle)]">
          <NotificationsPanel />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
