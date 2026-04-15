import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface Props {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: Props) {
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
