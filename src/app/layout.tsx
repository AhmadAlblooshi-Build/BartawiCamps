import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bartawi CMS',
  description: 'Camp Management System — Bartawi LLC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-text-primary font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
