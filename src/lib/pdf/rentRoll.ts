import { createDoc, addFooter, download, fmtAED, monthLabel } from './base'

export interface RentRollParams {
  month: number
  year: number
  rows: any[]
  totals?: { rent: number; paid: number; balance: number }
}

export function generateRentRoll(params: RentRollParams) {
  const doc = createDoc({
    title: 'Rent roll',
    subtitle: `${params.rows.length} records`,
    period: monthLabel(params.month, params.year),
  })

  const w = doc.internal.pageSize.getWidth()
  const colX = [40, 95, 200, 330, 410, 480]
  const colLabel = ['Room', 'Tenant', 'Company', 'Rent', 'Paid', 'Balance']
  let y = 150

  const header = () => {
    doc.setFillColor(232, 223, 209)
    doc.rect(40, y - 10, w - 80, 20, 'F')
    doc.setFontSize(8)
    doc.setTextColor(80, 72, 64)
    doc.setFont('helvetica', 'bold')
    colLabel.forEach((l, i) => {
      const align = i >= 3 ? 'right' : 'left'
      const x = i >= 3 ? colX[i] + 60 : colX[i]
      doc.text(l.toUpperCase(), x, y + 3, { align, charSpace: 1 })
    })
    y += 18
    doc.setFont('helvetica', 'normal')
  }

  header()

  params.rows.forEach((r, i) => {
    if (y > 780) {
      addFooter(doc, doc.getNumberOfPages(), 0)
      doc.addPage()
      doc.setFillColor(250, 247, 242)
      doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), 'F')
      y = 50
      header()
    }
    if (i % 2 === 1) {
      doc.setFillColor(244, 239, 231)
      doc.rect(40, y - 10, w - 80, 16, 'F')
    }
    doc.setFontSize(9)
    doc.setTextColor(26, 24, 22)
    doc.setFont('helvetica', 'bold')
    doc.text(r.room_number || '—', colX[0], y)
    doc.setFont('helvetica', 'normal')
    doc.text(truncate(r.owner_name || r.full_name || '—', 20), colX[1], y)
    doc.setTextColor(106, 97, 89)
    doc.text(truncate(r.company_name || '—', 24), colX[2], y)
    doc.setTextColor(26, 24, 22)
    doc.text(fmtAED(r.rent), colX[3] + 60, y, { align: 'right' })
    doc.setTextColor(30, 77, 82)
    doc.text(fmtAED(r.paid), colX[4] + 60, y, { align: 'right' })
    const balanceColor = Number(r.balance) > 0 ? [168, 74, 59] : [30, 77, 82]
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text(fmtAED(r.balance), colX[5] + 60, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 16
  })

  // Totals row
  if (params.totals) {
    y += 8
    doc.setDrawColor(26, 24, 22)
    doc.setLineWidth(1)
    doc.line(40, y - 4, w - 40, y - 4)
    doc.setFontSize(10)
    doc.setTextColor(26, 24, 22)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTALS', colX[0], y + 12)
    doc.text(fmtAED(params.totals.rent),    colX[3] + 60, y + 12, { align: 'right' })
    doc.text(fmtAED(params.totals.paid),    colX[4] + 60, y + 12, { align: 'right' })
    doc.text(fmtAED(params.totals.balance), colX[5] + 60, y + 12, { align: 'right' })
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { doc.setPage(i); addFooter(doc, i, pages) }
  download(doc, `rent-roll-${params.year}-${String(params.month).padStart(2, '0')}.pdf`)
}

function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + '…' : s }
