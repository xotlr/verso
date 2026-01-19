/**
 * MFA Verification API
 *
 * POST /api/user/mfa/verify - Verify TOTP code to complete enrollment
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { verifyMfaEnrollment } from '@/lib/mfa';
import { RATE_LIMITS } from '@/lib/rate-limit';

const verifySchema = z.object({
  factorId: z.string(),
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

/**
 * POST - Verify TOTP code to complete MFA enrollment
 * Rate limited to prevent brute force attacks on TOTP codes
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: verifySchema,
  rateLimit: RATE_LIMITS.MFA,
  handler: async ({ data }) => {
    await verifyMfaEnrollment(data.factorId, data.code);
    return { success: true };
  },
});
