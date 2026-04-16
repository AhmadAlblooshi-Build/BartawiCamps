'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useRouter } from 'next/navigation'
import type { User } from './types'

interface SessionState {
  token: string | null
  user: User | null
  loading: boolean
  setSession: (token: string, user: User) => void
  clear: () => void
  setLoading: (v: boolean) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      loading: false,
      setSession: (token, user) => set({ token, user, loading: false }),
      clear: () => set({ token: null, user: null, loading: false }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'bartawi-session',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
)

export function useHasPermission(perm: string): boolean {
  const user = useSession(s => s.user)
  return Boolean(user?.permissions?.includes(perm))
}

export function useLogout() {
  const clear = useSession(s => s.clear)
  const router = useRouter()
  return () => {
    clear()
    router.replace('/login')
  }
}
