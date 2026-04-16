import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid, parseISO, differenceInDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

export const TZ = 'Asia/Dubai'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, pattern = 'd MMM yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatInTimeZone(d, TZ, pattern)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, 'd MMM yyyy · HH:mm')
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return null
  return differenceInDays(d, new Date())
}

export function formatAED(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'AED 0'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!isFinite(n)) return 'AED 0'
  return `AED ${n.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
}

export function formatAEDShort(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `AED ${(n / 1_000).toFixed(1)}k`
  return `AED ${Math.round(n)}`
}

export function formatPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !isFinite(v)) return '—'
  return `${v.toFixed(decimals)}%`
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export function monthLabel(month: number): string { return MONTHS[month - 1] ?? '—' }

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '??'
  return name.split(/\s+/).filter(Boolean).slice(0, max).map(n => n[0]?.toUpperCase()).join('')
}

export function toQS(params?: Record<string, any>): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}
