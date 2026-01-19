import { z } from 'zod';
import { createApiHandler, handleSupabaseError } from '@/lib/api';
import { UnauthorizedError } from '@/lib/api/errors';

// Admin emails - in production, this would be in a database or environment variable
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  // Allow all users in development, or check admin list in production
  if (process.env.NODE_ENV !== 'production') return true;
  return ADMIN_EMAILS.includes(email);
}

const createIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.enum(['critical', 'major', 'minor']),
  affectedServices: z.array(z.string()),
  startedAt: z.string().optional(), // ISO date string
});

/**
 * GET /api/incidents
 * Returns all incidents (public, for status page).
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ searchParams, supabase }) => {
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // 'active' | 'resolved' | null (all)

    let query = supabase
      .from('Incident')
      .select(`
        *,
        updates:IncidentUpdate(*)
      `)
      .order('startedAt', { ascending: false })
      .limit(Math.min(limit, 100));

    if (status === 'active') {
      query = query.neq('status', 'resolved');
    } else if (status === 'resolved') {
      query = query.eq('status', 'resolved');
    }

    const { data: incidents, error } = await query;

    if (error) handleSupabaseError(error, "Incident");

    // Sort updates by createdAt descending
    interface IncidentResult {
      id: string
      title: string
      description: string | null
      status: string
      severity: string
      services: string[]
      startedAt: string
      resolvedAt: string | null
      updates: Array<{ id: string; createdAt: string; message: string; status: string }> | null
    }
    const sortedIncidents = ((incidents as IncidentResult[]) || []).map((incident) => ({
      ...incident,
      updates: ((incident.updates as unknown[]) || []).sort(
        (a: unknown, b: unknown) =>
          new Date((b as { createdAt: string }).createdAt).getTime() -
          new Date((a as { createdAt: string }).createdAt).getTime()
      ),
    }));

    return sortedIncidents;
  },
});

/**
 * POST /api/incidents
 * Create a new incident (admin only).
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: createIncidentSchema,
  handler: async ({ user, data, supabase }) => {
    // Check admin access
    const { data: dbUser, error: userError } = await supabase
      .from('User')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError) handleSupabaseError(userError, "Incident");

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    const { data: incident, error } = await supabase
      .from('Incident')
      .insert({
        title: data.title,
        description: data.description,
        severity: data.severity,
        affectedServices: data.affectedServices,
        startedAt: data.startedAt ? new Date(data.startedAt).toISOString() : new Date().toISOString(),
        status: 'investigating',
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, "Incident");

    return { ...incident, updates: [] };
  },
});
