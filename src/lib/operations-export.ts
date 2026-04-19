import type { OperationsRoom } from './operations-data'
import type { QueueKey } from '@/components/operations/QueueTabs'

function csvEscape(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

export function exportToCSV(queue: QueueKey, rooms: OperationsRoom[]) {
  const timestamp = new Date().toISOString().split('T')[0]
  let headers: string[] = []
  let lines: string[][] = []

  if (queue === 'outstanding') {
    headers = ['Room', 'Camp', 'Block', 'Tenant', 'Contract Type', 'Rent (AED)', 'Paid (AED)', 'Balance (AED)', 'Status', 'Has Legal Flag', 'Remarks']
    lines = rooms.map(r => [
      r.roomNumber,
      r.campName,
      r.blockCode,
      r.tenant,
      r.contractType || '',
      String(r.rent),
      String(r.paid),
      String(r.balance),
      r.isSynthesized ? 'Pending entry' : 'Confirmed outstanding',
      r.hasLegalIssue ? 'Yes' : '',
      r.remarks || '',
    ])
  }
  if (queue === 'expired') {
    headers = ['Room', 'Camp', 'Block', 'Company', 'Contract Start', 'Contract End', 'Days Expired', 'Rent (AED)', 'Balance (AED)', 'Has Legal Flag']
    lines = rooms.map(r => [
      r.roomNumber,
      r.campName,
      r.blockCode,
      r.tenant,
      formatDate(r.contractStartDate),
      formatDate(r.contractEndDate),
      String(Math.abs(r.daysUntilExpiry || 0)),
      String(r.rent),
      String(r.balance),
      r.hasLegalIssue ? 'Yes' : '',
    ])
  }
  if (queue === 'expiring') {
    headers = ['Room', 'Camp', 'Block', 'Company', 'Contract End', 'Days Left', 'Rent (AED)']
    lines = rooms.map(r => [
      r.roomNumber,
      r.campName,
      r.blockCode,
      r.tenant,
      formatDate(r.contractEndDate),
      String(r.daysUntilExpiry || 0),
      String(r.rent),
    ])
  }
  if (queue === 'vacancies') {
    headers = ['Room', 'Camp', 'Block', 'Floor', 'Last Tenant', 'Property Type']
    lines = rooms.map(r => [
      r.roomNumber,
      r.campName,
      r.blockCode,
      r.floor,
      r.tenant || '',
      r.raw?.property_type || '',
    ])
  }

  const csv = [
    headers.map(csvEscape).join(','),
    ...lines.map(row => row.map(csvEscape).join(',')),
  ].join('\n')

  download(`bartawi-${queue}-${timestamp}.csv`, csv)
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    // Simple toast could go here — for now just a console log
    console.log('Copied to clipboard')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
