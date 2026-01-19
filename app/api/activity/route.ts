import { createApiHandler } from '@/lib/api';

// GET /api/activity - Get user's activity feed
export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, searchParams, supabase }) => {
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [activitiesResult, countResult] = await Promise.all([
      supabase
        .from('Activity')
        .select('id, type, entityId, entityTitle, metadata, createdAt')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('Activity')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id),
    ]);

    const activities = activitiesResult.data || [];
    const total = countResult.count || 0;

    return {
      activities,
      total,
      hasMore: offset + activities.length < total,
    };
  },
});
