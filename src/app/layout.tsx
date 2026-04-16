import type { Metadata } from 'next'
import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
  display: 'swap',
})
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bartawi · Camps',
  description: 'Camp operations for Bartawi LLC',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          theme="light"
          toastOptions={{
            className: 'font-body text-sm',
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: '0 12px 28px -8px rgba(26,24,22,0.15)',
            },
          }}
        />
      </body>
    </html>
  )
}
