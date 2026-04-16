// TODO: Full implementation in Session 5, Section 13.1
'use client'
import { Bell } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function NotificationsButton() {
  // Stub — full implementation in Session 5, Section 13
  return (
    <button
      className="relative w-9 h-9 rounded-lg grid place-items-center hover:bg-sand-100 transition-colors"
      aria-label="Notifications"
      disabled
    >
      <Icon icon={Bell} size={18} />
    </button>
  )
}
