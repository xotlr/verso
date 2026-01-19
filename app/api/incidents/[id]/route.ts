import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { NotFoundError, UnauthorizedError } from '@/lib/api/errors';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return ADMIN_EMAILS.includes(email);
}

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
  severity: z.enum(['critical', 'major', 'minor']).optional(),
  affectedServices: z.array(z.string()).optional(),
  resolvedAt: z.string().nullable().optional(),
});

/**
 * GET /api/incidents/[id]
 * Get a single incident with updates.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ params, supabase }) => {
    const { data: incident, error } = await supabase
      .from('Incident')
      .select(`
        *,
        updates:IncidentUpdate(*)
      `)
      .eq('id', params.id)
      .single();

    if (error?.code === 'PGRST116' || !incident) {
      throw new NotFoundError('Incident');
    }
    if (error) throw error;

    // Sort updates by createdAt descending
    const sortedUpdates = ((incident.updates as unknown[]) || []).sort(
      (a: unknown, b: unknown) =>
        new Date((b as { createdAt: string }).createdAt).getTime() -
        new Date((a as { createdAt: string }).createdAt).getTime()
    );

    return { ...incident, updates: sortedUpdates };
  },
});

/**
 * PUT /api/incidents/[id]
 * Update an incident (admin only).
 */
export const PUT = createApiHandler({
  auth: 'required',
  schema: updateIncidentSchema,
  handler: async ({ user, params, data, supabase }) => {
    // Check admin access
    const { data: dbUser, error: userError } = await supabase
      .from('User')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    // Check incident exists
    const { data: existing, error: existingError } = await supabase
      .from('Incident')
      .select('id, resolvedAt')
      .eq('id', params.id)
      .single();

    if (existingError?.code === 'PGRST116' || !existing) {
      throw new NotFoundError('Incident');
    }
    if (existingError) throw existingError;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.severity) updateData.severity = data.severity;
    if (data.affectedServices) updateData.affectedServices = data.affectedServices;
    if (data.status) {
      updateData.status = data.status;
      // Auto-set resolvedAt when marking as resolved
      if (data.status === 'resolved' && !existing.resolvedAt) {
        updateData.resolvedAt = new Date().toISOString();
      }
    }
    if (data.resolvedAt !== undefined) {
      updateData.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt).toISOString() : null;
    }

    const { data: incident, error: updateError } = await supabase
      .from('Incident')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Fetch updates
    const { data: updates } = await supabase
      .from('IncidentUpdate')
      .select('*')
      .eq('incidentId', params.id)
      .order('createdAt', { ascending: false });

    return { ...incident, updates: updates || [] };
  },
});

/**
 * DELETE /api/incidents/[id]
 * Delete an incident (admin only).
 */
export const DELETE = createApiHandler({
  auth: 'required',
  handler: async ({ user, params, supabase }) => {
    // Check admin access
    const { data: dbUser, error: userError } = await supabase
      .from('User')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    // Check incident exists
    const { data: existing, error: existingError } = await supabase
      .from('Incident')
      .select('id')
      .eq('id', params.id)
      .single();

    if (existingError?.code === 'PGRST116' || !existing) {
      throw new NotFoundError('Incident');
    }
    if (existingError) throw existingError;

    const { error: deleteError } = await supabase
      .from('Incident')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return { success: true };
  },
});
