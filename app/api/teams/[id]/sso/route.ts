/**
 * Team SSO Configuration API
 *
 * GET  /api/teams/[id]/sso - Get SSO status
 * PUT  /api/teams/[id]/sso - Update SSO configuration
 * DELETE /api/teams/[id]/sso - Clear SSO configuration
 */

import { z } from 'zod';
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from '@/lib/api';
import { getTeamSsoStatus, updateTeamSsoConfig, clearTeamSsoConfig } from '@/lib/sso';
import { logTeamAction } from '@/lib/audit-log';
import { getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

// Schema for SSO update
const ssoUpdateSchema = z.object({
  ssoEnabled: z.boolean().optional(),
  ssoProvider: z.enum(['saml', 'oidc']).nullable().optional(),
  ssoConfig: z.object({
    // SAML fields
    entityId: z.string().optional(),
    ssoUrl: z.string().url().optional(),
    certificate: z.string().optional(),
    signRequests: z.boolean().optional(),
    signatureAlgorithm: z.enum(['sha256', 'sha512']).optional(),
    // OIDC fields
    issuer: z.string().url().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    authorizationEndpoint: z.string().url().optional(),
    tokenEndpoint: z.string().url().optional(),
    userinfoEndpoint: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
  }).nullable().optional(),
  ssoDomain: z.string().nullable().optional(),
  ssoEnforced: z.boolean().optional(),
});

/**
 * GET - Get SSO status for a team
 */
export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, params, supabase }) => {
    const { id: teamId } = params;

    // Check team exists and user has access
    const [membershipResult, teamResult] = await Promise.all([
      supabase
        .from('TeamMember')
        .select('role')
        .eq('teamId', teamId)
        .eq('userId', user.id)
        .single(),
      supabase
        .from('Team')
        .select('id, ownerId')
        .eq('id', teamId)
        .single(),
    ]);

    if (teamResult.error?.code === 'PGRST116' || !teamResult.data) {
      throw new NotFoundError('Team');
    }
    if (teamResult.error) handleSupabaseError(teamResult.error, 'Team');

    const team = teamResult.data;
    const membership = membershipResult.data;

    // Only owners and admins can view SSO settings
    const canViewSso =
      team.ownerId === user.id ||
      (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN'));

    if (!canViewSso) {
      throw new ForbiddenError('Only owners and admins can view SSO settings');
    }

    const status = await getTeamSsoStatus(teamId);
    return { sso: status };
  },
});

/**
 * PUT - Update SSO configuration
 * Rate limited to prevent abuse of admin functionality
 */
export const PUT = createApiHandler({
  auth: 'required',
  schema: ssoUpdateSchema,
  rateLimit: RATE_LIMITS.SSO_CONFIG,
  handler: async ({ user, params, data, supabase, request }) => {
    const { id: teamId } = params;

    // Check team exists and user is owner
    const [membershipResult, teamResult] = await Promise.all([
      supabase
        .from('TeamMember')
        .select('role')
        .eq('teamId', teamId)
        .eq('userId', user.id)
        .single(),
      supabase
        .from('Team')
        .select('id, ownerId')
        .eq('id', teamId)
        .single(),
    ]);

    if (teamResult.error?.code === 'PGRST116' || !teamResult.data) {
      throw new NotFoundError('Team');
    }
    if (teamResult.error) handleSupabaseError(teamResult.error, 'Team');

    const team = teamResult.data;
    const membership = membershipResult.data;

    // Only owners can modify SSO settings
    const isOwner = team.ownerId === user.id || membership?.role === 'OWNER';

    if (!isOwner) {
      throw new ForbiddenError('Only team owners can modify SSO settings');
    }

    // Build the update object with proper typing
    const ssoUpdateData: Partial<{
      ssoEnabled: boolean;
      ssoProvider: 'saml' | 'oidc' | null;
      ssoConfig: Record<string, unknown> | null;
      ssoDomain: string | null;
      ssoEnforced: boolean;
    }> = {};

    if (data.ssoEnabled !== undefined) ssoUpdateData.ssoEnabled = data.ssoEnabled;
    if (data.ssoProvider !== undefined) ssoUpdateData.ssoProvider = data.ssoProvider;
    if (data.ssoConfig !== undefined) ssoUpdateData.ssoConfig = data.ssoConfig as Record<string, unknown> | null;
    if (data.ssoDomain !== undefined) ssoUpdateData.ssoDomain = data.ssoDomain;
    if (data.ssoEnforced !== undefined) ssoUpdateData.ssoEnforced = data.ssoEnforced;

    const status = await updateTeamSsoConfig(teamId, ssoUpdateData);

    // Log the SSO configuration change
    void logTeamAction({
      teamId,
      actorId: user.id,
      action: 'team_updated',
      targetType: 'settings',
      metadata: {
        field: 'sso',
        ssoEnabled: status.enabled,
        ssoProvider: status.provider,
        ssoDomain: status.domain,
        ssoEnforced: status.enforced,
      },
      ipAddress: getClientIp(request),
    });

    return { sso: status };
  },
});

/**
 * DELETE - Clear SSO configuration
 */
export const DELETE = createApiHandler({
  auth: 'required',
  handler: async ({ user, params, supabase, request }) => {
    const { id: teamId } = params;

    // Check team exists and user is owner
    const [membershipResult, teamResult] = await Promise.all([
      supabase
        .from('TeamMember')
        .select('role')
        .eq('teamId', teamId)
        .eq('userId', user.id)
        .single(),
      supabase
        .from('Team')
        .select('id, ownerId')
        .eq('id', teamId)
        .single(),
    ]);

    if (teamResult.error?.code === 'PGRST116' || !teamResult.data) {
      throw new NotFoundError('Team');
    }
    if (teamResult.error) handleSupabaseError(teamResult.error, 'Team');

    const team = teamResult.data;
    const membership = membershipResult.data;

    // Only owners can clear SSO settings
    const isOwner = team.ownerId === user.id || membership?.role === 'OWNER';

    if (!isOwner) {
      throw new ForbiddenError('Only team owners can clear SSO settings');
    }

    await clearTeamSsoConfig(teamId);

    // Log the SSO removal
    void logTeamAction({
      teamId,
      actorId: user.id,
      action: 'team_updated',
      targetType: 'settings',
      metadata: {
        field: 'sso',
        action: 'cleared',
      },
      ipAddress: getClientIp(request),
    });

    return { success: true };
  },
});
