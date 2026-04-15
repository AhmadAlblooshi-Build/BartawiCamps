import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// AED formatter — always use this for money
export function formatAED(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'AED —'
  return `AED ${Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Short AED formatter for tables
export function formatAEDShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Percentage
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

// Date formatters
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'dd MMM yyyy') } catch { return '—' }
}

export function formatMonthYear(month: number, year: number): string {
  const d = new Date(year, month - 1, 1)
  return format(d, 'MMMM yyyy')
}

// Month name
export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

// Status display helpers
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    occupied:     'text-status-occupied',
    vacant:       'text-status-vacant',
    bartawi_use:  'text-status-bartawi',
    maintenance:  'text-status-maintenance',
    legal_dispute: 'text-status-legal',
    active:       'text-status-occupied',
    expired:      'text-status-vacant',
    terminated:   'text-text-muted',
  }
  return map[status] ?? 'text-text-muted'
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    occupied:     'bg-status-occupied-dim text-status-occupied',
    vacant:       'bg-status-vacant-dim text-status-vacant',
    bartawi_use:  'bg-status-bartawi-dim text-status-bartawi',
    maintenance:  'bg-yellow-500/10 text-yellow-400',
    legal_dispute: 'bg-status-legal-dim text-status-legal',
    active:       'bg-status-occupied-dim text-status-occupied',
    expired:      'bg-status-vacant-dim text-status-vacant',
    open:         'bg-accent-glow text-accent-cyan',
    in_progress:  'bg-yellow-500/10 text-yellow-400',
    resolved:     'bg-status-occupied-dim text-status-occupied',
    closed:       'bg-border text-text-muted',
    monthly:      'bg-accent-glow text-accent-cyan',
    yearly:       'bg-purple-500/10 text-purple-400',
    ejari:        'bg-blue-500/10 text-blue-400',
    bgc:          'bg-status-bartawi-dim text-status-bartawi',
    standard:     'bg-blue-500/10 text-blue-400',
    bartawi:      'bg-status-bartawi-dim text-status-bartawi',
    commercial:   'bg-purple-500/10 text-purple-400',
    service:      'bg-green-500/10 text-green-400',
  }
  return map[status] ?? 'bg-border text-text-muted'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    occupied:      'Occupied',
    vacant:        'Vacant',
    bartawi_use:   'Bartawi',
    maintenance:   'Maintenance',
    legal_dispute: 'Legal',
    active:        'Active',
    expired:       'Expired',
    terminated:    'Terminated',
    open:          'Open',
    in_progress:   'In Progress',
    resolved:      'Resolved',
    closed:        'Closed',
    monthly:       'Monthly',
    yearly:        'Yearly',
    ejari:         'Ejari',
    bgc:           'BGC',
    cash:          'Cash',
    cheque:        'Cheque',
    bank_transfer: 'Bank Transfer',
    card:          'Card',
    low:           'Low',
    medium:        'Medium',
    high:          'High',
    urgent:        'Urgent',
    standard:      'Standard',
    bartawi:       'Bartawi',
    commercial:    'Commercial',
    service:       'Service',
  }
  return map[status] ?? status
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low:    'text-text-muted',
    medium: 'text-yellow-400',
    high:   'text-orange-400',
    urgent: 'text-status-vacant',
  }
  return map[priority] ?? 'text-text-muted'
}

// Tenant name helper — Camp 1 uses owner_name, Camp 2 uses company_name
export function getTenantName(record: { owner_name?: string; company_name?: string }): string {
  return record.company_name || record.owner_name || '—'
}

// Balance color — red if positive (they owe money), green if zero
export function getBalanceColor(balance: number): string {
  if (balance > 0) return 'text-status-vacant'
  if (balance < 0) return 'text-status-occupied'
  return 'text-text-muted'
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}
