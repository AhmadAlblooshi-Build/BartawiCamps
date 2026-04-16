'use client'
import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/lib/auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { token, loading } = useSession()
  const router = useRouter()
  const path = usePathname() || '/'

  useEffect(() => {
    if (!loading && !token) {
      const next = encodeURIComponent(path)
      router.replace(`/login?next=${next}`)
    }
  }, [loading, token, path, router])

  if (loading || !token) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-sand-50">
        <div className="display-md italic text-espresso-muted animate-fade">Bartawi</div>
      </div>
    )
  }
  return <>{children}</>
}
