import { z } from 'zod';

export const collectDepositSchema = z.object({
  camp_id: z.string().uuid(),
  room_id: z.string().uuid(),
  contract_id: z.string().uuid().optional(),
  occupancy_id: z.string().uuid().optional(),
  amount: z.number().positive().max(1000000),
  currency: z.string().default('AED'),
  payment_method: z.enum(['cash', 'cheque', 'bank_transfer', 'other']),
  payment_reference: z.string().max(255).optional(),
  notes: z.string().optional(),
}).refine((data) => data.contract_id || data.occupancy_id, {
  message: 'Either contract_id or occupancy_id must be provided',
});

export const refundDepositSchema = z.object({
  refunded_amount: z.number().min(0).optional(),
  forfeited_amount: z.number().min(0).optional(),
  refund_reason: z.string().optional(),
  forfeiture_reason: z.string().optional(),
  refund_method: z.enum(['cash', 'cheque', 'bank_transfer']).optional(),
}).refine((data) =>
  (data.refunded_amount && data.refunded_amount > 0) || (data.forfeited_amount && data.forfeited_amount > 0),
  { message: 'Must specify either refunded_amount or forfeited_amount' }
).refine((data) =>
  !data.forfeited_amount || (data.forfeited_amount > 0 && data.forfeiture_reason),
  { message: 'forfeiture_reason is required when forfeiting' }
);
