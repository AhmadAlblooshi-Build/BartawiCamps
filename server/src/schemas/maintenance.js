import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  camp_id: z.string().uuid(),
  room_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(4000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  reported_by_name: z.string().max(255).optional(),
  image_urls: z.array(z.string().url()).max(10).optional(),
});

export const updateMaintenanceSchema = z.object({
  status: z.enum(['open', 'assigned', 'in_progress', 'blocked', 'resolved', 'closed', 'cancelled']).optional(),
  assigned_team_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  resolution_notes: z.string().optional(),
});

export const assignMaintenanceSchema = z.object({
  assigned_team_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
}).refine((data) => data.assigned_team_id || data.assigned_user_id, {
  message: 'Must specify either assigned_team_id or assigned_user_id',
});
