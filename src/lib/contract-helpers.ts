export type ContractStatus =
  | 'active'
  | 'expiring_soon'    // within 30 days
  | 'expired'
  | 'none'

export interface ContractInfo {
  type: 'monthly' | 'yearly' | null
  startDate: string | null
  endDate: string | null
  status: ContractStatus
  daysUntilExpiry: number | null
  hasLegalIssue: boolean
}

/**
 * Extracts contract info from a room using the new API data shape.
 * Reads from current_month first, then falls back to monthly_records[0].
 */
export function getContractInfo(room: any): ContractInfo {
  // Primary source: current_month (could be synthesized or real April)
  // Fallback: most recent real record in monthly_records history
  const currentMonth = room?.current_month
  const historyFirst = room?.monthly_records?.[0]

  const source = currentMonth || historyFirst
  if (!source) {
    return {
      type: null,
      startDate: null,
      endDate: null,
      status: 'none',
      daysUntilExpiry: null,
      hasLegalIssue: false,
    }
  }

  // Contract type
  const typeRaw = (source.contract_type || '').toString().toLowerCase()
  const type: 'monthly' | 'yearly' | null =
    typeRaw.includes('yearly') ? 'yearly' :
    typeRaw.includes('monthly') ? 'monthly' :
    null

  // Dates
  const startDate = source.contract_start_date || null
  const endDate = source.contract_end_date || null

  // Legal flag — check remarks across current_month AND history
  const remarksSources = [
    currentMonth?.remarks,
    ...(room?.monthly_records || []).map((r: any) => r.remarks),
  ].filter(Boolean).map((s: string) => s.toLowerCase())
  const hasLegalIssue = remarksSources.some(r => r.includes('legal'))

  // Compute expiry status
  let daysUntilExpiry: number | null = null
  let status: ContractStatus = 'none'

  if (endDate) {
    const end = new Date(endDate)
    const now = new Date()
    const diffMs = end.getTime() - now.getTime()
    daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) status = 'expired'
    else if (daysUntilExpiry <= 30) status = 'expiring_soon'
    else status = 'active'
  } else if (type === 'yearly') {
    status = 'active'   // yearly contract but no end_date parsed
  } else if (type === 'monthly') {
    status = 'active'   // monthly has no end date — always active
  }

  return {
    type,
    startDate,
    endDate,
    status,
    daysUntilExpiry,
    hasLegalIssue,
  }
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}
