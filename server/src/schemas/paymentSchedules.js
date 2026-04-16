import { z } from 'zod';

export const generateSchedulesSchema = z.object({
  contract_id: z.string().uuid().optional(),
  occupancy_id: z.string().uuid().optional(),
  start_month: z.number().int().min(1).max(12),
  start_year: z.number().int().min(2020).max(2100),
  months: z.number().int().min(1).max(60),
  monthly_amount: z.number().positive(),
  due_day: z.number().int().min(1).max(28), // Safe for all months
}).refine((data) => data.contract_id || data.occupancy_id, {
  message: 'Either contract_id or occupancy_id must be provided',
});

export const overrideScheduleSchema = z.object({
  scheduled_amount: z.number().positive().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  status: z.enum(['scheduled', 'waived', 'cancelled']).optional(),
  notes: z.string().optional(),
});
