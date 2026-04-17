import { createDoc, addFooter, download, fmtAED, monthLabel } from './base'

export function generateMonthlySummary(params: { month: number; year: number; camps: any[] }) {
  const doc = createDoc({
    title: 'Monthly summary',
    subtitle: `${params.camps.length} ${params.camps.length === 1 ? 'camp' : 'camps'}`,
    period: monthLabel(params.month, params.year),
  })

  const w = doc.internal.pageSize.getWidth()
  let y = 160

  params.camps.forEach((camp: any) => {
    if (y > 680) { doc.addPage(); doc.setFillColor(250,247,242); doc.rect(0,0,w,doc.internal.pageSize.getHeight(),'F'); y = 50 }

    // Camp header
    doc.setFillColor(26, 24, 22)
    doc.roundedRect(40, y, w - 80, 36, 4, 4, 'F')
    doc.setTextColor(250, 247, 242)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(camp.name, 54, y + 23)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(184, 136, 61)
    doc.text(`${camp.occupancy?.total_rooms || 0} rooms · ${camp.occupancy?.occupied || 0} occupied`, w - 54, y + 23, { align: 'right' })
    y += 50

    // KPI grid
    const kpis = [
      { label: 'Occupancy',    value: `${(camp.occupancy?.occupancy_rate ?? 0).toFixed(1)}%`, color: [26, 24, 22] },
      { label: 'Collection',   value: `${(camp.financials?.collection_rate ?? 0).toFixed(1)}%`, color: [30, 77, 82] },
      { label: 'Rent billed',  value: fmtAED(camp.financials?.total_rent ?? 0), color: [26, 24, 22] },
      { label: 'Collected',    value: fmtAED(camp.financials?.total_paid ?? 0), color: [30, 77, 82] },
      { label: 'Outstanding',  value: fmtAED(camp.financials?.total_balance ?? 0), color: camp.financials?.total_balance > 0 ? [168, 74, 59] : [30, 77, 82] },
      { label: 'People',       value: String(camp.people?.total ?? 0), color: [26, 24, 22] },
    ]
    const cellW = (w - 80) / 3
    kpis.forEach((k, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 40 + col * cellW
      const yy = y + row * 50
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(x + 2, yy, cellW - 4, 44, 4, 4, 'F')
      doc.setFontSize(8)
      doc.setTextColor(120, 110, 100)
      doc.text(k.label.toUpperCase(), x + 10, yy + 14, { charSpace: 1 })
      doc.setFontSize(15)
      doc.setTextColor(k.color[0], k.color[1], k.color[2])
      doc.setFont('helvetica', 'bold')
      doc.text(k.value, x + 10, yy + 33)
      doc.setFont('helvetica', 'normal')
    })
    y += 110
  })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { doc.setPage(i); addFooter(doc, i, pages) }
  download(doc, `summary-${params.year}-${String(params.month).padStart(2, '0')}.pdf`)
}
