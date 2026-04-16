import type { ReactNode } from 'react'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { AuthGuard } from '@/components/shell/AuthGuard'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 px-8 py-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
