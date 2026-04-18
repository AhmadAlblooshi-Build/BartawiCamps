'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system' as Theme,
      resolved: 'light' as 'light' | 'dark',
      _hasHydrated: false,
      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme)
        set({ theme, resolved })
        applyTheme(resolved)
      },
      setHasHydrated: (v: boolean) => {
        const state = get()
        const resolved = resolveTheme(state.theme)
        set({ _hasHydrated: v, resolved })
        applyTheme(resolved)
      },
    }),
    {
      name: 'bartawi-theme',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // Add transition class for smooth switch
  root.classList.add('transitioning')

  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('transitioning')
  }, 350)
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useTheme.getState()
    if (state.theme === 'system') {
      const resolved = getSystemTheme()
      useTheme.setState({ resolved })
      applyTheme(resolved)
    }
  })
}
