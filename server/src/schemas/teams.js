import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().trim().optional(),
  icon_name: z.string().max(50).optional(),
});

export const addTeamMemberSchema = z.object({
  user_id: z.string().uuid(),
  is_lead: z.boolean().default(false),
});
