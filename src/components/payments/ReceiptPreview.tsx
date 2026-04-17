'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { motion } from 'motion/react'
import { X, Download, Printer } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { formatAED, formatDate } from '@/lib/utils'
import { generatePaymentReceipt } from '@/lib/pdf/receipt'

export function ReceiptPreview({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['receipt', paymentId],
    queryFn: () => endpoints.paymentReceiptData(paymentId),
  })

  const downloadPDF = () => {
    if (!data) return
    generatePaymentReceipt(data)
  }

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/40 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Receipt</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="display-xs">Receipt</div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>
            {!data ? (
              <div className="p-8"><div className="h-64 skeleton-shimmer rounded-lg" /></div>
            ) : (
              <>
                <div className="p-8 bg-sand-50">
                  <div className="bezel p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <div className="font-display text-2xl italic leading-none mb-1">Bartawi</div>
                        <div className="eyebrow">Labour Camp</div>
                      </div>
                      <div className="text-right">
                        <div className="eyebrow mb-1">Receipt</div>
                        <div className="font-mono tabular text-[13px] text-espresso">{data.receipt_number}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <Field label="Date"   value={formatDate(data.date)} />
                      <Field label="Camp"   value={data.camp} />
                      <Field label="Tenant" value={data.tenant} />
                      <Field label="Room"   value={data.room} mono />
                      {data.period && <Field label="Period" value={data.period} />}
                      <Field label="Method" value={data.payment_method.replace('_', ' ')} />
                      {data.payment_reference && <Field label="Reference" value={data.payment_reference} mono />}
                    </div>
                    <div className="pt-6 border-t-2 border-espresso flex items-end justify-between">
                      <div className="eyebrow">Amount received</div>
                      <div className="font-mono tabular display-md text-espresso">{formatAED(data.amount)}</div>
                    </div>
                    <div className="mt-6 text-[10px] text-espresso-muted text-center">
                      Issued by {data.received_by} · Bartawi LLC · Dubai, UAE
                    </div>
                  </div>
                </div>
                <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
                  <button onClick={downloadPDF}
                    className="h-9 px-3 rounded-full bg-sand-100 text-espresso text-[12px] font-medium hover:bg-sand-200 transition-all flex items-center gap-1.5">
                    <Icon icon={Download} size={12} /> Download PDF
                  </button>
                  <button onClick={() => window.print()}
                    className="h-9 px-3 rounded-full bg-sand-100 text-espresso text-[12px] font-medium hover:bg-sand-200 transition-all flex items-center gap-1.5">
                    <Icon icon={Printer} size={12} /> Print
                  </button>
                </footer>
              </>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className={`text-[13px] text-espresso ${mono ? 'font-mono tabular' : ''}`}>{value}</div>
    </div>
  )
}
