import { z } from 'zod';
import { createApiHandler, handleSupabaseError } from '@/lib/api';
import { NotFoundError, UnauthorizedError } from '@/lib/api/errors';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return ADMIN_EMAILS.includes(email);
}

const createUpdateSchema = z.object({
  message: z.string().min(1),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
});

/**
 * GET /api/incidents/[id]/updates
 * Get all updates for an incident.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ params, supabase }) => {
    const { data: incident, error: incidentError } = await supabase
      .from('Incident')
      .select('id')
      .eq('id', params.id)
      .single();

    if (incidentError?.code === 'PGRST116' || !incident) {
      throw new NotFoundError('Incident');
    }
    if (incidentError) handleSupabaseError(incidentError, "IncidentUpdate");

    const { data: updates, error } = await supabase
      .from('IncidentUpdate')
      .select('*')
      .eq('incidentId', params.id)
      .order('createdAt', { ascending: false });

    if (error) handleSupabaseError(error, "IncidentUpdate");

    return updates || [];
  },
});

/**
 * POST /api/incidents/[id]/updates
 * Add an update to an incident (admin only).
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: createUpdateSchema,
  handler: async ({ user, params, data, supabase }) => {
    // Check admin access
    const { data: dbUser, error: userError } = await supabase
      .from('User')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError) handleSupabaseError(userError, "IncidentUpdate");

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    // Check incident exists
    const { data: incident, error: incidentError } = await supabase
      .from('Incident')
      .select('id, resolvedAt')
      .eq('id', params.id)
      .single();

    if (incidentError?.code === 'PGRST116' || !incident) {
      throw new NotFoundError('Incident');
    }
    if (incidentError) handleSupabaseError(incidentError, "IncidentUpdate");

    // Create update
    const { data: update, error: createError } = await supabase
      .from('IncidentUpdate')
      .insert({
        incidentId: params.id,
        message: data.message,
        status: data.status,
      })
      .select()
      .single();

    if (createError) handleSupabaseError(createError, "IncidentUpdate");

    // Also update the incident status
    const updateData: Record<string, unknown> = { status: data.status };
    if (data.status === 'resolved' && !incident.resolvedAt) {
      updateData.resolvedAt = new Date().toISOString();
    }

    await supabase
      .from('Incident')
      .update(updateData)
      .eq('id', params.id);

    return update;
  },
});
