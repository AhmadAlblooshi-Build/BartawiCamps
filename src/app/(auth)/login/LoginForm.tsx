'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'motion/react'
import { ArrowRight, Warning } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { endpoints } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { ease } from '@/lib/motion'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const setSession = useSession(s => s.setSession)
  const [err, setErr] = useState<string | null>(search.get('expired') ? 'Your session expired. Sign in again.' : null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      setErr(null)
      const res = await endpoints.login(data.email, data.password)
      setSession(res.token, {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        permissions: res.user.permissions
      })
      const next = search.get('next') || '/'
      router.replace(next)
    } catch (e: any) {
      setErr(e.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-sand-50">
      {/* Left — Editorial side */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-sand-100 via-sand-50 to-amber-50/30"
      >
        {/* Decorative geometric anchor */}
        <div className="absolute inset-0 pointer-events-none">
          <svg viewBox="0 0 800 1000" className="w-full h-full opacity-[0.04]" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M60 0L0 0 0 60" fill="none" stroke="#1A1816" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="1000" fill="url(#grid)" />
            <circle cx="400" cy="500" r="320" fill="none" stroke="#B8883D" strokeWidth="0.8" />
            <circle cx="400" cy="500" r="240" fill="none" stroke="#B8883D" strokeWidth="0.6" />
            <circle cx="400" cy="500" r="160" fill="none" stroke="#B8883D" strokeWidth="0.4" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-espresso text-sand-50 grid place-items-center">
            <span className="font-display text-xl italic leading-none">B</span>
          </div>
          <div>
            <div className="font-display text-lg tracking-tight">Bartawi</div>
            <div className="eyebrow">Camp Operations</div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease }}
          className="relative z-10 max-w-[520px]"
        >
          <div className="eyebrow mb-4">Phase 1 · Camps</div>
          <h1 className="display-xl mb-6">
            Operations, <span className="text-amber-500">precisely.</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-espresso-soft max-w-[440px]">
            The operating system for Bartawi&rsquo;s camp properties. Real-time occupancy,
            structured tenant records, financial tracking — across every room, block, and camp.
          </p>
        </motion.div>

        <div className="relative z-10 flex items-center gap-6 text-[11px] font-body text-espresso-subtle">
          <div><span className="tabular font-mono text-espresso">453</span> rooms</div>
          <div className="w-px h-3 bg-espresso-subtle/30" />
          <div><span className="tabular font-mono text-espresso">2</span> camps</div>
          <div className="w-px h-3 bg-espresso-subtle/30" />
          <div><span className="tabular font-mono text-espresso">1,359</span> records tracked</div>
        </div>
      </motion.section>

      {/* Right — Form side */}
      <section className="flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-10">
            <div className="eyebrow mb-2">Sign in</div>
            <h2 className="display-md">Welcome back</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                autoFocus
                className="w-full h-11 px-4 bg-white border border-[color:var(--color-border-medium)] rounded-lg font-body text-sm text-espresso placeholder:text-espresso-subtle focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="ahmad@bartawi.com"
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="w-full h-11 px-4 bg-white border border-[color:var(--color-border-medium)] rounded-lg font-body text-sm text-espresso placeholder:text-espresso-subtle focus:border-amber-500 focus:outline-none transition-colors"
                placeholder="••••••••••"
              />
            </Field>

            {err && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rust-pale border border-rust/20 text-[12px] text-rust">
                <Icon icon={Warning} size={14} className="mt-0.5 shrink-0" />
                <div>{err}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full h-11 flex items-center justify-center gap-2 px-4 rounded-full bg-espresso text-sand-50 font-body text-[13px] font-medium hover:bg-espresso-soft transition-all duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              {!isSubmitting && (
                <span className="w-6 h-6 rounded-full bg-sand-50/10 grid place-items-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <Icon icon={ArrowRight} size={12} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-espresso-subtle">
            Having trouble signing in? Contact your administrator.
          </p>
        </motion.div>
      </section>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-body text-[11px] font-medium tracking-wide uppercase text-espresso-muted">{label}</label>
      {children}
      {error && <div className="text-[11px] text-rust">{error}</div>}
    </div>
  )
}
