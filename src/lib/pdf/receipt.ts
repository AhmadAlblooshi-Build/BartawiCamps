import { createDoc, addFooter, download, fmtAED, fmtDate } from './base'

export interface ReceiptData {
  receipt_number: string
  date: string
  camp: string
  tenant: string
  room: string
  period?: string
  amount: number
  payment_method: string
  payment_reference?: string
  received_by: string
}

export function generatePaymentReceipt(data: ReceiptData) {
  const doc = createDoc({
    title: 'Payment receipt',
    subtitle: data.receipt_number,
    period: fmtDate(data.date),
  })

  const w = doc.internal.pageSize.getWidth()
  let y = 160

  // Info grid
  const col1 = 40
  const col2 = w / 2 + 10

  const row = (label: string, value: string, x: number, yy: number) => {
    doc.setFontSize(8)
    doc.setTextColor(120, 110, 100)
    doc.text(label.toUpperCase(), x, yy, { charSpace: 1 })
    doc.setFontSize(11)
    doc.setTextColor(26, 24, 22)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '—', x, yy + 14)
  }

  row('Tenant',       data.tenant, col1, y)
  row('Room',         data.room,   col2, y)
  y += 36
  row('Camp',         data.camp,   col1, y)
  row('Period',       data.period || '—', col2, y)
  y += 36
  row('Method',       data.payment_method.replace('_', ' '), col1, y)
  if (data.payment_reference) row('Reference', data.payment_reference, col2, y)
  y += 50

  // Amount bar
  doc.setDrawColor(26, 24, 22)
  doc.setLineWidth(2)
  doc.line(40, y, w - 40, y)
  y += 30
  doc.setFontSize(10)
  doc.setTextColor(120, 110, 100)
  doc.text('AMOUNT RECEIVED', 40, y, { charSpace: 1 })
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 77, 82)
  doc.text(fmtAED(data.amount), w - 40, y + 6, { align: 'right' })

  // Signatures
  y += 80
  doc.setDrawColor(150, 140, 130)
  doc.setLineWidth(0.5)
  doc.line(40, y, 240, y)
  doc.line(w - 240, y, w - 40, y)
  doc.setFontSize(8)
  doc.setTextColor(120, 110, 100)
  doc.text(`Received by: ${data.received_by}`, 40, y + 14)
  doc.text('Tenant signature', w - 40, y + 14, { align: 'right' })

  addFooter(doc, 1, 1)
  download(doc, `${data.receipt_number}.pdf`)
}
