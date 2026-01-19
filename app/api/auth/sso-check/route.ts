/**
 * SSO Check API
 *
 * POST /api/auth/sso-check - Check if an email should route to SSO
 *
 * Used on the login page to determine if the user should be redirected to their organization's SSO provider.
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { shouldRouteToSso } from '@/lib/sso';

const ssoCheckSchema = z.object({
  email: z.string().email(),
});

export const POST = createApiHandler({
  auth: 'none',
  schema: ssoCheckSchema,
  handler: async ({ data }) => {
    const { email } = data;

    const result = await shouldRouteToSso(email);

    if (result.shouldRoute) {
      return {
        sso: true,
        provider: result.provider,
        // Don't expose teamId to unauthenticated users
      };
    }

    return {
      sso: false,
    };
  },
});
