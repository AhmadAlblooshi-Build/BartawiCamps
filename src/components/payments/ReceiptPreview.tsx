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
                  <div className="bezel p-10 bg-white">
                    {/* Letterhead */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-sand-200">
                      <div className="font-display text-3xl italic leading-none mb-2 text-espresso">Bartawi</div>
                      <div className="text-[13px] text-espresso-muted mb-3">Labour Camp Management</div>
                      <div className="text-[11px] text-espresso-faint">
                        Dubai, United Arab Emirates
                      </div>
                      <div className="text-[11px] text-espresso-faint">
                        TRN: [To be configured]
                      </div>
                    </div>

                    {/* Receipt header */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <div className="display-sm text-espresso mb-1">Payment Receipt</div>
                        <div className="text-[12px] text-espresso-muted">Official payment confirmation</div>
                      </div>
                      <div className="text-right">
                        <div className="eyebrow mb-1">Receipt No.</div>
                        <div className="font-mono tabular text-[14px] font-bold text-espresso">{data.receipt_number}</div>
                      </div>
                    </div>

                    {/* Receipt details table */}
                    <div className="mb-8">
                      <table className="w-full">
                        <tbody className="divide-y divide-sand-200">
                          <tr>
                            <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted w-1/3">Date</td>
                            <td className="py-3 text-[13px] text-espresso">{formatDate(data.date)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Camp</td>
                            <td className="py-3 text-[13px] text-espresso">{data.camp}</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Tenant</td>
                            <td className="py-3 text-[13px] text-espresso">{data.tenant}</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Room Number</td>
                            <td className="py-3 text-[13px] font-mono text-espresso">{data.room}</td>
                          </tr>
                          {data.period && (
                            <tr>
                              <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Period</td>
                              <td className="py-3 text-[13px] text-espresso">{data.period}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Payment Method</td>
                            <td className="py-3 text-[13px] text-espresso capitalize">{data.payment_method.replace('_', ' ')}</td>
                          </tr>
                          {data.payment_reference && (
                            <tr>
                              <td className="py-3 text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Reference</td>
                              <td className="py-3 text-[13px] font-mono text-espresso">{data.payment_reference}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Amount section */}
                    <div className="pt-6 border-t-2 border-espresso bg-sand-50 -mx-10 -mb-10 px-10 pb-10 mt-8">
                      <div className="flex items-end justify-between mb-8">
                        <div className="eyebrow">Total Amount Received</div>
                        <div className="font-mono tabular display-md font-bold text-espresso">{formatAED(data.amount)}</div>
                      </div>

                      {/* Footer */}
                      <div className="pt-6 border-t border-sand-200">
                        <div className="text-[11px] text-espresso-muted text-center">
                          Issued by {data.received_by}
                        </div>
                        <div className="text-[10px] text-espresso-faint text-center mt-1">
                          This is an official receipt from Bartawi LLC
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
                  <button onClick={downloadPDF}
                    className="h-9 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft transition-all flex items-center gap-2 active:scale-[0.98]">
                    <Icon icon={Download} size={13} /> Download PDF
                  </button>
                  <button onClick={() => window.print()}
                    className="h-9 px-4 rounded-full bg-sand-100 text-espresso text-[12px] font-medium hover:bg-sand-200 transition-all flex items-center gap-2 active:scale-[0.98]">
                    <Icon icon={Printer} size={13} /> Print
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
