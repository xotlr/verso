/**
 * User sessions API
 * GET  /api/user/sessions - List active sessions
 * DELETE /api/user/sessions - Revoke all other sessions
 */

import { createApiHandler } from '@/lib/api';
import { getAccessToken } from '@/lib/supabase-auth';
import { getUserSessions, revokeAllOtherSessions } from '@/lib/session-tracking';
import { RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET - List all active sessions for the current user
 */
export const GET = createApiHandler({
  auth: 'required',
  rateLimit: RATE_LIMITS.SESSION,
  handler: async ({ user }) => {
    const accessToken = await getAccessToken();
    const sessions = await getUserSessions(user.id, accessToken || undefined);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        country: session.country,
        city: session.city,
        lastActive: session.lastActive,
        createdAt: session.createdAt,
        isCurrent: session.isCurrent,
      })),
    };
  },
});

/**
 * DELETE - Revoke all sessions except the current one
 */
export const DELETE = createApiHandler({
  auth: 'required',
  rateLimit: RATE_LIMITS.SESSION,
  handler: async ({ user }) => {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { revokedCount: 0, error: 'No active session' };
    }

    const revokedCount = await revokeAllOtherSessions(user.id, accessToken);

    return { revokedCount };
  },
});
