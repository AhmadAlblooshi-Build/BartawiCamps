import { type Variants, type Transition, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect, useState } from 'react'

// ─── Spring configs ───
export const spring = {
  default:  { type: 'spring' as const, stiffness: 300, damping: 30 },
  fast:     { type: 'spring' as const, stiffness: 400, damping: 35 },
  gentle:   { type: 'spring' as const, stiffness: 200, damping: 25 },
  bouncy:   { type: 'spring' as const, stiffness: 350, damping: 20 },
}

// Legacy exports for backwards compatibility
export const springSoft: Transition = spring.gentle
export const ease = [0.22, 1, 0.36, 1] as const
export const easeIn = [0.55, 0, 1, 0.45] as const

// ─── Fade in (default entrance) ───
export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
}

// ─── Slide up (cards, panels, content blocks) ───
export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring.default },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.14 } },
}

// ─── Rise in (legacy - kept for existing components) ───
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease } },
}

// ─── Slide in from right (drawers) ───
export const slideRight: Variants = {
  hidden:  { x: '100%' },
  visible: { x: 0, transition: spring.fast },
  exit:    { x: '100%', transition: { duration: 0.18, ease: easeIn } },
}

// ─── Scale up (modals, dialogs) ───
export const scaleUp: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: spring.default },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.14 } },
}

// ─── Stagger container (lists, grids) ───
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
}

// Legacy stagger parent (kept for backwards compatibility)
export const staggerParent = (stagger = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
})

// ─── Stagger item (children of stagger container) ───
export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring.default },
}

// ─── Card hover lift ───
export const cardHover = {
  rest:  { y: 0, boxShadow: '0 1px 3px rgba(26,24,22,0.04), 0 4px 12px rgba(26,24,22,0.03)' },
  hover: { y: -2, boxShadow: '0 4px 16px rgba(26,24,22,0.08)', transition: spring.fast },
  tap:   { y: 0, scale: 0.995, transition: { duration: 0.1 } },
}

// ─── Button press ───
export const buttonPress = {
  tap: { scale: 0.97, transition: { duration: 0.1 } },
}

// ─── Number counter (for stat cards) ───
export function useCountUp(target: number, duration = 800): number {
  const [displayValue, setDisplayValue] = useState(0)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(count, target, {
      duration: duration / 1000,
      ease: ease,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    })
    return controls.stop
  }, [target, count, duration])

  return displayValue
}

// ─── Reduced motion support ───
export const reducedMotion: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
}

// ─── Hook to detect reduced motion preference ───
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
