import { z } from 'zod';

export const renewSchema = z.object({
  new_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_monthly_rent: z.number().positive().max(1000000).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'terminated', 'legal_dispute', 'expired', 'pending_renewal']),
  notes: z.string().max(2000).optional(),
});

export const addNoteSchema = z.object({
  note: z.string().min(1).max(2000),
  note_type: z.string().max(50).default('general'),
});

export const listQuerySchema = z.object({
  campId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});
