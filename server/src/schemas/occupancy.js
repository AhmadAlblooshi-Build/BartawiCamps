import { z } from 'zod';

export const checkoutSchema = z.object({
  room_id: z.string().uuid(),
  camp_id: z.string().uuid(),
  occupancy_id: z.string().uuid().optional(),
  checkout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  reason_for_leaving: z.string().min(1).max(200),
  final_balance_settled: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export const checkinSchema = z.object({
  room_id: z.string().uuid(),
  camp_id: z.string().uuid(),
  // Camp 1
  owner_name: z.string().min(1).max(255).optional(),
  individual_id: z.string().uuid().optional(),
  // Camp 2
  company_id: z.string().uuid().optional(),
  company_name: z.string().min(1).max(255).optional(),
  contract_type: z.enum(['monthly', 'yearly', 'ejari', 'bgc']).optional(),
  contract_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contract_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ejari_number: z.string().max(100).optional(),
  // Emergency Contact (Migration 019)
  emergency_contact_name: z.string().max(255).optional(),
  emergency_contact_phone: z.string().max(50).optional(),
  emergency_contact_relation: z.enum(['spouse', 'parent', 'sibling', 'child', 'friend', 'coworker', 'other']).optional(),
  emergency_contact_country: z.string().max(100).optional(),
  // Both
  monthly_rent: z.number().positive().max(1000000),
  people_count: z.number().int().min(0).max(50),
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  off_days: z.number().int().min(0).max(31).optional(),
}).refine(
  d => d.owner_name || d.individual_id || d.company_id || d.company_name,
  'Must provide owner_name OR individual_id OR company_id OR company_name'
);

export const giveNoticeSchema = z.object({
  room_id: z.string().uuid(),
  camp_id: z.string().uuid(),
  occupancy_id: z.string().uuid().optional(),
  intended_vacate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional(),
});

export const completeCheckoutSchema = z.object({
  room_id: z.string().uuid(),
  camp_id: z.string().uuid(),
  occupancy_id: z.string().uuid().optional(),
  actual_checkout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason_for_leaving: z.string().min(1).max(200),
  inspection_notes: z.string().max(2000).optional(),
  final_balance_settled: z.boolean(),
  deposit_action: z.enum(['refund_full', 'forfeit_full', 'refund_partial', 'none']).default('none'),
  deposit_refund_amount: z.number().min(0).optional(),
  deposit_forfeit_amount: z.number().min(0).optional(),
  deposit_reason: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
