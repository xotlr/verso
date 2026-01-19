/**
 * MFA Management API
 *
 * GET    /api/user/mfa - Get MFA status
 * POST   /api/user/mfa - Start MFA enrollment
 * DELETE /api/user/mfa - Unenroll MFA (with factor ID in body)
 */

import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { getMfaStatus, enrollMfa, unenrollMfa } from '@/lib/mfa';
import { RATE_LIMITS } from '@/lib/rate-limit';

const enrollSchema = z.object({
  friendlyName: z.string().optional(),
});

const unenrollSchema = z.object({
  factorId: z.string(),
});

/**
 * GET - Get MFA status for the current user
 */
export const GET = createApiHandler({
  auth: 'required',
  handler: async () => {
    const status = await getMfaStatus();
    return { mfa: status };
  },
});

/**
 * POST - Start MFA enrollment (generate QR code)
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: enrollSchema,
  rateLimit: RATE_LIMITS.MFA,
  handler: async ({ data }) => {
    const enrollment = await enrollMfa(data.friendlyName);

    return {
      enrollment: {
        id: enrollment.id,
        qrCode: enrollment.qrCode,
        secret: enrollment.secret,
        totpUri: enrollment.totpUri,
      },
    };
  },
});

/**
 * DELETE - Remove an MFA factor
 */
export const DELETE = createApiHandler({
  auth: 'required',
  schema: unenrollSchema,
  handler: async ({ data }) => {
    await unenrollMfa(data.factorId);
    return { success: true };
  },
});
