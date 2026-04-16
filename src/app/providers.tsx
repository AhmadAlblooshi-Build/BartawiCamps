'use client'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))
  return (
    <QueryClientProvider client={qc}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
