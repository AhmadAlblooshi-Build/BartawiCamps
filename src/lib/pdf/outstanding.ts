import { createDoc, addFooter, download, fmtAED, monthLabel } from './base'

export function generateOutstanding(params: { month: number; year: number; records: any[]; totals?: any }) {
  const doc = createDoc({
    title: 'Outstanding balances',
    subtitle: `${params.records.length} unpaid records`,
    period: monthLabel(params.month, params.year),
  })

  // Group by entity
  const grouped = new Map<string, { name: string; balance: number; rooms: string[] }>()
  params.records.forEach(r => {
    const key = r.entity_group_name || r.company_name || r.owner_name || 'Unknown'
    const existing = grouped.get(key) || { name: key, balance: 0, rooms: [] as string[] }
    existing.balance += Number(r.balance || 0)
    existing.rooms.push(r.room_number)
    grouped.set(key, existing)
  })
  const sorted = Array.from(grouped.values()).sort((a, b) => b.balance - a.balance)

  const w = doc.internal.pageSize.getWidth()
  let y = 160

  sorted.forEach((g, i) => {
    if (y > 760) {
      addFooter(doc, doc.getNumberOfPages(), 0)
      doc.addPage()
      doc.setFillColor(250, 247, 242)
      doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), 'F')
      y = 50
    }

    // Card
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(40, y, w - 80, 50, 6, 6, 'F')
    doc.setDrawColor(168, 74, 59)
    doc.setLineWidth(2)
    doc.line(40, y, 40, y + 50)

    doc.setFontSize(8)
    doc.setTextColor(120, 110, 100)
    doc.text(`#${String(i + 1).padStart(2, '0')}`, 52, y + 16, { charSpace: 1 })
    doc.setFontSize(12)
    doc.setTextColor(26, 24, 22)
    doc.setFont('helvetica', 'bold')
    doc.text(g.name, 80, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(106, 97, 89)
    const roomsLabel = `${g.rooms.length} rooms: ${g.rooms.slice(0, 6).join(', ')}${g.rooms.length > 6 ? '…' : ''}`
    doc.text(roomsLabel, 80, y + 34)

    doc.setFontSize(16)
    doc.setTextColor(168, 74, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(fmtAED(g.balance), w - 48, y + 30, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 60
  })

  const total = sorted.reduce((s, g) => s + g.balance, 0)
  y += 10
  doc.setDrawColor(26, 24, 22)
  doc.setLineWidth(1.5)
  doc.line(40, y, w - 40, y)
  doc.setFontSize(11)
  doc.setTextColor(26, 24, 22)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL OUTSTANDING', 40, y + 20, { charSpace: 1 })
  doc.setFontSize(18)
  doc.setTextColor(168, 74, 59)
  doc.text(fmtAED(total), w - 40, y + 20, { align: 'right' })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { doc.setPage(i); addFooter(doc, i, pages) }
  download(doc, `outstanding-${params.year}-${String(params.month).padStart(2, '0')}.pdf`)
}
