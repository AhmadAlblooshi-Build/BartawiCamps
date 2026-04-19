/**
 * Payment Helpers - Phase 4A Write Layer
 *
 * Utility functions for payment method formatting and date handling.
 * Used by LogPaymentDialog and payment history components.
 */

export type PaymentMethod = 'cash' | 'cheque' | 'bank_transfer' | 'card' | 'other'

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  other: 'Other',
}

/**
 * Format payment method enum to display label
 */
export function formatMethod(method: PaymentMethod): string {
  return METHOD_LABELS[method] || method
}

/**
 * Get payment method details requirements
 * Returns fields that are required/optional for each payment method
 */
export function paymentMethodDetails(method: PaymentMethod): {
  requiresCheque: boolean
  requiresTransfer: boolean
} {
  return {
    requiresCheque: method === 'cheque',
    requiresTransfer: method === 'bank_transfer',
  }
}

/**
 * Format ISO date string to display format (YYYY-MM-DD)
 */
export function formatDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return ''

  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate

  // Handle invalid dates
  if (isNaN(date.getTime())) return ''

  // Return YYYY-MM-DD format
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Format ISO date string to display format with month name
 */
export function formatDateLong(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return ''

  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate

  // Handle invalid dates
  if (isNaN(date.getTime())) return ''

  // Return "Jan 15, 2026" format
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  return date.toLocaleDateString('en-US', options)
}

/**
 * Get today's date in YYYY-MM-DD format (for date input default value)
 */
export function getTodayISO(): string {
  return formatDate(new Date())
}
