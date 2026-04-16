'use client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useSession, useLogout } from '@/lib/auth'
import { initials } from '@/lib/utils'
import { CaretDown, User as UserIcon, SignOut, Gear } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import Link from 'next/link'

export function UserMenu() {
  const user = useSession(s => s.user)
  const logout = useLogout()

  if (!user) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sand-100 transition-colors outline-none">
          <div className="w-8 h-8 rounded-full bg-espresso text-sand-50 grid place-items-center font-body text-xs font-semibold">
            {initials(user.fullName || user.email)}
          </div>
          <div className="flex flex-col items-start min-w-0 max-w-[160px]">
            <div className="text-[12px] leading-tight font-medium text-espresso truncate">{user.fullName || user.email}</div>
          </div>
          <Icon icon={CaretDown} size={12} className="text-espresso-subtle" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="min-w-[220px] bg-white rounded-xl shadow-raise-3 py-1.5 z-50 animate-fade border border-[color:var(--color-border-subtle)]"
        >
          <div className="px-3 py-2 border-b border-[color:var(--color-border-subtle)]">
            <div className="font-body text-[13px] font-medium text-espresso">{user.fullName}</div>
            <div className="font-body text-[11px] text-espresso-muted truncate">{user.email}</div>
          </div>
          <MenuLink href="/admin/settings" icon={UserIcon}>Profile</MenuLink>
          <MenuLink href="/admin/settings" icon={Gear}>Settings</MenuLink>
          <DropdownMenu.Separator className="my-1 border-t border-[color:var(--color-border-subtle)]" />
          <DropdownMenu.Item asChild>
            <button onClick={() => logout()} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-rust hover:bg-rust-pale cursor-pointer outline-none">
              <Icon icon={SignOut} size={14} />
              Sign out
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function MenuLink({ href, icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item asChild>
      <Link href={href} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-espresso-soft hover:bg-sand-100 outline-none">
        <Icon icon={icon} size={14} />
        {children}
      </Link>
    </DropdownMenu.Item>
  )
}
