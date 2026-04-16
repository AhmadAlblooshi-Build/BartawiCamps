import { z } from 'zod';

// Accept any 8-4-4-4-12 hex pattern (UUID v1-v5 all pass).
// Strict .uuid() rejects non-v4 UUIDs, which can break legitimate IDs
// depending on how they were generated.
const uuidLoose = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  { message: 'Invalid UUID format' }
);

export const reportQuerySchema = z.object({
  campId:   uuidLoose.optional(),
  camp_ids: z.string().optional(),
  month:    z.coerce.number().int().min(1).max(12),
  year:     z.coerce.number().int().min(2020).max(2100),
  groupBy:  z.enum(['entity_group', 'size']).optional(),
}).refine(
  (data) => Boolean(data.campId || data.camp_ids),
  { message: 'Either campId or camp_ids must be provided', path: ['campId'] }
);

export const occupancyReportQuerySchema = z.object({
  campId:   uuidLoose.optional(),
  camp_ids: z.string().optional(),
  groupBy:  z.enum(['size']).optional(),
}).refine(
  (data) => Boolean(data.campId || data.camp_ids),
  { message: 'Either campId or camp_ids must be provided', path: ['campId'] }
);
