import type { Variants, Transition } from 'motion/react'

export const spring: Transition = { type: 'spring', stiffness: 200, damping: 26, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 22, mass: 1 }
export const ease = [0.16, 1, 0.3, 1] as const

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease } },
}

export const staggerParent = (stagger = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
})
