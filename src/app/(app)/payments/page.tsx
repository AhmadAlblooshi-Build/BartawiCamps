'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, formatDate, getCurrentMonthYear } from '@/lib/utils'
import { Plus, Receipt, MagnifyingGlass } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { LogPaymentModal } from '@/components/payments/LogPaymentModal'
import { ReceiptPreview } from '@/components/payments/ReceiptPreview'
import { motion, AnimatePresence } from 'motion/react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion'

export default function PaymentsPage() {
  const [logOpen, setLogOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data } = useQuery({ queryKey: ['payments'], queryFn: () => endpoints.payments({ limit: 100 }) })

  // Filter payments based on selected filters
  const filteredPayments = data?.data?.filter((p: any) => {
    const paymentDate = new Date(p.payment_date)
    const matchesMonth = paymentDate.getMonth() + 1 === month
    const matchesYear = paymentDate.getFullYear() === year
    const matchesMethod = paymentMethod === 'all' || p.payment_method === paymentMethod
    const matchesSearch = searchQuery === '' ||
      p.room?.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.individual?.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.individual?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesMonth && matchesYear && matchesMethod && matchesSearch
  }) || []

  const hasActiveFilters = paymentMethod !== 'all' || searchQuery !== ''

  return (
    <motion.div
      className="space-y-8 atmosphere"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="display-lg">Payments</h1>
          <p className="overline mt-2">
            Log cash, cheque, and bank transfer payments · Receipts auto-generate
          </p>
        </div>
        <button onClick={() => setLogOpen(true)}
          className="h-10 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
          <Icon icon={Plus} size={13} /> Log payment
        </button>
      </div>

      {/* Filter bar - evolved styling */}
      <div className="rounded-[14px] p-3 flex items-center gap-3 flex-wrap" style={{ background: 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.6)' }}>
        <div className="flex items-center gap-2">
          <span className="overline">Month</span>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-sand-200 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer transition-colors">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="overline">Year</span>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-sand-200 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer transition-colors">
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="overline">Method</span>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
            className="h-9 px-3 rounded-lg bg-sand-200 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer transition-colors">
            <option value="all">All methods</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Icon icon={MagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by room or tenant..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-sand-100 text-[12px] text-espresso border-0 outline-none hover:bg-sand-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-espresso-faint"
            />
          </div>
        </div>
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setPaymentMethod('all'); setSearchQuery('') }}
              className="text-[11px] text-amber hover:text-amber-hover font-medium transition-colors">
              Clear all
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {!data ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}</div>
      ) : filteredPayments.length === 0 ? (
        <div className="bezel p-12 text-center">
          <Icon icon={Receipt} size={48} className="text-sand-300 mx-auto mb-4" />
          <div className="display-sm text-espresso mb-1">No payments found</div>
          <p className="text-[13px] text-espresso-muted">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Payments will appear here once logged'}
          </p>
        </div>
      ) : (
        <div className="bezel overflow-hidden">
          {/* Table header - evolved styling */}
          <div className="grid grid-cols-[100px_1fr_1fr_120px_140px_120px] gap-0 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-100">
            <div className="eyebrow uppercase">Date</div>
            <div className="eyebrow uppercase">Tenant</div>
            <div className="eyebrow uppercase">Room</div>
            <div className="eyebrow uppercase">Method</div>
            <div className="eyebrow uppercase text-right">Amount</div>
            <div className="eyebrow uppercase text-right">Receipt</div>
          </div>
          <motion.div
            className="divide-y divide-[color:var(--color-border-subtle)] max-h-[calc(100vh-440px)] overflow-y-auto"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {filteredPayments.slice(0, 8).map((p: any, idx: number) => (
              <motion.div
                key={p.id}
                variants={staggerItem}
                className="grid grid-cols-[100px_1fr_1fr_120px_140px_120px] gap-0 px-4 py-3 transition-colors items-center"
                style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.15)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--color-sand-200-rgb, 214, 207, 197), 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.15)'}
              >
                <div className="text-[12px] text-espresso">{formatDate(p.payment_date)}</div>
                <div className="text-[13px] text-espresso truncate pr-3">{p.company?.name || p.individual?.owner_name || p.individual?.full_name || '—'}</div>
                <div className="text-[13px] text-espresso-muted font-mono tabular">{p.room?.room_number || '—'}</div>
                <div className="text-[11px] text-espresso-muted capitalize">{p.payment_method.replace('_', ' ')}</div>
                <div className="text-right font-mono tabular text-[14px] font-bold text-espresso">{formatAED(p.amount)}</div>
                <div className="text-right flex items-center justify-end gap-2">
                  {p.receipt_number && (
                    <div className="text-[11px] font-mono text-espresso-muted">#{p.receipt_number}</div>
                  )}
                  <button onClick={() => setReceiptId(p.id)}
                    className="w-7 h-7 rounded-md grid place-items-center bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors"
                    aria-label="View receipt">
                    <Icon icon={Receipt} size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
            {filteredPayments.slice(8).map((p: any, idx: number) => (
              <div
                key={p.id}
                className="grid grid-cols-[100px_1fr_1fr_120px_140px_120px] gap-0 px-4 py-3 transition-colors items-center"
                style={{ background: (idx + 8) % 2 === 0 ? 'transparent' : 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.15)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--color-sand-200-rgb, 214, 207, 197), 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = (idx + 8) % 2 === 0 ? 'transparent' : 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.15)'}
              >
                <div className="text-[12px] text-espresso">{formatDate(p.payment_date)}</div>
                <div className="text-[13px] text-espresso truncate pr-3">{p.company?.name || p.individual?.owner_name || p.individual?.full_name || '—'}</div>
                <div className="text-[13px] text-espresso-muted font-mono tabular">{p.room?.room_number || '—'}</div>
                <div className="text-[11px] text-espresso-muted capitalize">{p.payment_method.replace('_', ' ')}</div>
                <div className="text-right font-mono tabular text-[14px] font-bold text-espresso">{formatAED(p.amount)}</div>
                <div className="text-right flex items-center justify-end gap-2">
                  {p.receipt_number && (
                    <div className="text-[11px] font-mono text-espresso-muted">#{p.receipt_number}</div>
                  )}
                  <button onClick={() => setReceiptId(p.id)}
                    className="w-7 h-7 rounded-md grid place-items-center bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors"
                    aria-label="View receipt">
                    <Icon icon={Receipt} size={12} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {logOpen && <LogPaymentModal onClose={() => setLogOpen(false)} />}
      {receiptId && <ReceiptPreview paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </motion.div>
  )
}
