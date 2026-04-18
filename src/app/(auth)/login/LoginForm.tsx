'use client'
import React, { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'motion/react'
import { ArrowRight, Warning, CircleNotch } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { endpoints } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { ease, useCountUp } from '@/lib/motion'

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
  const [showErrorShake, setShowErrorShake] = useState(false)

  // Count-up animations for stats
  const roomsCount = useCountUp(453, 800)
  const campsCount = useCountUp(2, 800)
  const tenantsCount = useCountUp(3600, 800)

  // Parallax mouse tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10
    setMousePos({ x, y })
  }, [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      setErr(null)
      setShowErrorShake(false)
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
      setShowErrorShake(true)
      // Reset shake animation after it completes
      setTimeout(() => setShowErrorShake(false), 900)
    }
  }

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
      {/* Left — The Statement */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        onMouseMove={handleMouseMove}
        className="relative hidden lg:flex flex-col justify-center items-center p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-sand-100) 0%, var(--color-sand-50) 60%, rgba(184, 136, 61, 0.05) 100%)'
        }}
      >
        {/* Background decoration with parallax */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
          <motion.svg
            viewBox="0 0 800 1000"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
            animate={{ x: mousePos.x, y: mousePos.y }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M60 0L0 0 0 60" fill="none" stroke="#B8883D" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="1000" fill="url(#grid)" />
          </motion.svg>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full border border-amber opacity-[0.08] pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-24 h-24 rounded-full border border-amber opacity-[0.08] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full border border-amber opacity-[0.08] pointer-events-none" />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease }}
          className="relative z-10 flex flex-col items-center text-center max-w-[480px]"
        >
          <div className="display-hero mb-3">Bartawi</div>
          <div className="w-[60px] h-[2px] bg-amber mb-3" />
          <div className="eyebrow text-amber mb-12" style={{ letterSpacing: '0.15em' }}>CAMP MANAGEMENT SYSTEM</div>

          <h1 className="display-lg mb-2 text-espresso">
            Operations,
          </h1>
          <h1 className="display-lg mb-8 text-amber italic">
            precisely.
          </h1>

          {/* Stats strip */}
          <div className="flex items-center gap-8 mt-4">
            <div className="flex flex-col items-center">
              <div className="data-xl tabular">{roomsCount.toLocaleString()}</div>
              <div className="eyebrow mt-1">Rooms</div>
            </div>
            <div className="w-px h-10 bg-amber" />
            <div className="flex flex-col items-center">
              <div className="data-xl tabular">{campsCount}</div>
              <div className="eyebrow mt-1">Camps</div>
            </div>
            <div className="w-px h-10 bg-amber" />
            <div className="flex flex-col items-center">
              <div className="data-xl tabular">{tenantsCount.toLocaleString()}</div>
              <div className="eyebrow mt-1">Tenants</div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Right — The Form */}
      <section className="login-right-panel flex items-center justify-center p-6 lg:p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease }}
          className="w-full max-w-[360px]"
        >
          <div className="mb-6">
            <div className="overline mb-2 text-espresso-muted">Welcome back</div>
            <h2 className="display-md">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                autoFocus
                className="w-full h-12 px-4 bg-white border border-sand-200 rounded-[14px] font-body text-sm text-espresso placeholder:text-espresso-subtle focus:border-amber focus:ring-2 focus:ring-amber/10 focus:outline-none transition-all duration-200"
                placeholder="ahmad@bartawi.com"
              />
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="w-full h-12 px-4 bg-white border border-sand-200 rounded-[14px] font-body text-sm text-espresso placeholder:text-espresso-subtle focus:border-amber focus:ring-2 focus:ring-amber/10 focus:outline-none transition-all duration-200"
                placeholder="••••••••••"
              />
            </Field>

            {err && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  x: showErrorShake ? [0, -4, 4, -4, 4, -2, 2, 0] : 0
                }}
                transition={{
                  opacity: { duration: 0.2 },
                  x: { duration: 0.3, times: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 1] }
                }}
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rust-pale border border-rust/20 text-[12px] text-rust"
              >
                <Icon icon={Warning} size={14} className="mt-0.5 shrink-0" />
                <div>{err}</div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-espresso text-sand-50 font-body text-[13px] font-medium hover:bg-espresso-soft transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Icon icon={CircleNotch} size={16} />
                  </motion.span>
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
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
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <div className="flex flex-col gap-2" onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}>
      <label className={`overline transition-colors duration-200 ${isFocused ? 'text-amber' : 'text-espresso-muted'}`}>
        {label}
      </label>
      {children}
      {error && <div className="text-[11px] text-rust">{error}</div>}
    </div>
  )
}
