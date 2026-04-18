'use client'
import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { Bell } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { NotificationsPanel } from './NotificationsPanel'
import { motion } from 'motion/react'
import { spring, scaleUp } from '@/lib/motion'
import { useEffect, useRef } from 'react'

export function NotificationsButton() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => endpoints.notifications(),
    refetchInterval: 60_000,
  })
  const unread = data?.unread_count ?? 0
  const prevUnreadRef = useRef(unread)

  // Track previous unread count for animation trigger
  useEffect(() => {
    prevUnreadRef.current = unread
  }, [unread])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <motion.button
          className="relative w-9 h-9 rounded-lg grid place-items-center hover:bg-sand-100 transition-colors"
          aria-label={`${unread} unread notifications`}
          whileHover={{ rotate: 10 }}
          transition={spring.default}
        >
          <Icon icon={Bell} size={18} emphasis={unread > 0} />
          {unread > 0 && (
            <motion.span
              key={unread}
              variants={scaleUp}
              initial="hidden"
              animate="visible"
              className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rust text-white text-[9px] font-semibold flex items-center justify-center tabular font-mono"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </motion.button>
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
