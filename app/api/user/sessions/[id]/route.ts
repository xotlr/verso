/**
 * Individual session management
 * DELETE /api/user/sessions/[id] - Revoke a specific session
 */

import { createApiHandler, NotFoundError } from '@/lib/api';
import { revokeSession } from '@/lib/session-tracking';

/**
 * DELETE - Revoke a specific session
 */
export const DELETE = createApiHandler({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { id: sessionId } = params;

    const success = await revokeSession(user.id, sessionId);

    if (!success) {
      throw new NotFoundError('Session');
    }

    return { success: true };
  },
});
