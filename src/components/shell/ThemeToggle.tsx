'use client'

import { useTheme } from '@/lib/theme'
import { Sun, Moon, Monitor } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useRef, useEffect } from 'react'

const options = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
]

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const currentIcon = resolved === 'dark' ? Moon : Sun

  return (
    <div ref={ref} className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg grid place-items-center
                   hover:bg-sand-200/60 transition-colors duration-150"
        aria-label={`Theme: ${theme}. Click to change.`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={resolved}
            initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.2 }}
          >
            <Icon icon={currentIcon} size={18} />
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-20 w-40
                       bezel elevation-float rounded-xl overflow-hidden
                       dark:bg-[#222019] dark:border-[rgba(255,255,255,0.08)]
                       z-50"
          >
            <div className="p-1.5">
              {options.map((opt) => {
                const isActive = theme === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value)
                      setOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                      text-[13px] font-medium transition-colors duration-150
                      ${isActive
                        ? 'bg-amber/10 text-amber dark:text-[#C9993E]'
                        : 'text-[#6A6159] hover:text-[#1A1816] hover:bg-sand-200/50 dark:text-[#A09889] dark:hover:text-[#E8E0D6]'
                      }
                    `}
                  >
                    <Icon icon={opt.icon} size={16} />
                    <span>{opt.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="theme-check"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-amber"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Current mode indicator */}
            <div className="border-t border-sand-200/50 dark:border-[rgba(255,255,255,0.08)] px-3 py-2">
              <p className="eyebrow text-[#6A6159] dark:text-[#6A6159]">
                {resolved === 'dark' ? '🌙' : '☀️'} {resolved.charAt(0).toUpperCase() + resolved.slice(1)} mode active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
