import { z } from 'zod';

export const createPropertyTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().trim().optional(),
  icon_name: z.string().max(50).optional(),
  display_color: z.enum(['amber', 'teal', 'rust', 'neutral']).default('neutral'),
  is_residential: z.boolean().default(true),
  is_leasable: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const updatePropertyTypeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().optional(),
  icon_name: z.string().max(50).optional(),
  display_color: z.enum(['amber', 'teal', 'rust', 'neutral']).optional(),
  is_residential: z.boolean().optional(),
  is_leasable: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});
