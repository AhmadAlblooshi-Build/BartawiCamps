'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, formatDate } from '@/lib/utils'
import { Plus, Receipt } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { LogPaymentModal } from '@/components/payments/LogPaymentModal'
import { ReceiptPreview } from '@/components/payments/ReceiptPreview'

export default function PaymentsPage() {
  const [logOpen, setLogOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const { data } = useQuery({ queryKey: ['payments'], queryFn: () => endpoints.payments({ limit: 100 }) })

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Cash collection</div>
          <h1 className="display-lg">Payments</h1>
          <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
            Log cash, cheque, and bank transfer payments. Receipts auto-generate.
          </p>
        </div>
        <button onClick={() => setLogOpen(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> Log payment
        </button>
      </div>

      {!data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}</div>
      ) : data.data.length === 0 ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso">No payments logged yet</div>
        </div>
      ) : (
        <div className="bezel overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_1fr_120px_140px_120px] gap-0 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-50">
            <div className="eyebrow">Date</div>
            <div className="eyebrow">Tenant</div>
            <div className="eyebrow">Room</div>
            <div className="eyebrow">Method</div>
            <div className="eyebrow text-right">Amount</div>
            <div className="eyebrow text-right">Receipt</div>
          </div>
          <div className="divide-y divide-[color:var(--color-border-subtle)] max-h-[calc(100vh-340px)] overflow-y-auto">
            {data.data.map((p: any) => (
              <div key={p.id} className="grid grid-cols-[100px_1fr_1fr_120px_140px_120px] gap-0 px-4 py-3 hover:bg-sand-50 transition-colors items-center">
                <div className="text-[12px] text-espresso">{formatDate(p.payment_date)}</div>
                <div className="text-[13px] text-espresso truncate pr-3">{p.company?.name || p.individual?.owner_name || p.individual?.full_name || '—'}</div>
                <div className="text-[13px] text-espresso-muted font-mono tabular">{p.room?.room_number || '—'}</div>
                <div className="text-[11px] text-espresso-muted capitalize">{p.payment_method.replace('_', ' ')}</div>
                <div className="text-right font-mono tabular text-[13px] font-semibold text-teal">{formatAED(p.amount)}</div>
                <div className="text-right">
                  <button onClick={() => setReceiptId(p.id)}
                    className="w-7 h-7 rounded-md grid place-items-center bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors"
                    aria-label="View receipt">
                    <Icon icon={Receipt} size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {logOpen && <LogPaymentModal onClose={() => setLogOpen(false)} />}
      {receiptId && <ReceiptPreview paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </div>
  )
}
