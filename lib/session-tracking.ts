/**
 * Session tracking for device/session management
 *
 * Tracks user sessions to allow viewing active sessions and revoking them.
 * Uses SHA-256 hash of access token prefix as session identifier.
 */

import { createServerActionClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Result type for Supabase queries (UserSession added via migration, not in generated types)
interface UserSessionRow {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  lastActive: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface UserSession {
  id: string;
  sessionToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  lastActive: string;
  createdAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface TrackSessionParams {
  userId: string;
  accessToken: string;
  userAgent: string | null;
  ipAddress: string | null;
}

/**
 * Generate a session token hash from the access token
 * Uses SHA-256 of first 100 chars for privacy
 */
function getSessionToken(accessToken: string): string {
  const prefix = accessToken.substring(0, 100);
  return crypto.createHash('sha256').update(prefix).digest('hex').substring(0, 16);
}

/**
 * Parse user agent string into readable device info
 */
function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = 'Unknown browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Detect device type
  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
  const isTablet = ua.includes('tablet') || ua.includes('ipad');
  const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';

  return `${browser} on ${os} (${deviceType})`;
}

/**
 * Track a session on login/activity
 * Creates or updates the session record
 */
export async function trackSession(params: TrackSessionParams): Promise<void> {
  const { userId, accessToken, userAgent, ipAddress } = params;

  try {
    const supabase = await createServerActionClient();
    const sessionToken = getSessionToken(accessToken);
    const deviceInfo = parseUserAgent(userAgent);

    // Upsert session (update lastActive if exists, create if not)
    // Type assertion needed: UserSession table added via migration
    const { error } = await (supabase.from('UserSession') as ReturnType<typeof supabase.from>)
      .upsert(
        {
          userId,
          sessionToken,
          deviceInfo,
          ipAddress,
          lastActive: new Date().toISOString(),
        },
        {
          onConflict: 'userId,sessionToken',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      logger.error('Failed to track session', new Error(error.message), {
        userId,
        errorCode: error.code,
      });
    }
  } catch (error) {
    // Fire-and-forget - don't break the main flow
    logger.error('Session tracking error', error instanceof Error ? error : new Error(String(error)), {
      userId,
    });
  }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string,
  currentAccessToken?: string
): Promise<UserSession[]> {
  const supabase = await createServerActionClient();
  const currentSessionToken = currentAccessToken ? getSessionToken(currentAccessToken) : null;

  // Type assertion needed: UserSession table added via migration
  const { data, error } = await (supabase.from('UserSession') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('userId', userId)
    .is('revokedAt', null)
    .order('lastActive', { ascending: false }) as { data: UserSessionRow[] | null; error: Error | null };

  if (error) {
    logger.error('Failed to get user sessions', new Error(error.message), { userId });
    throw new Error('Failed to get sessions');
  }

  return (data || []).map((session) => ({
    ...session,
    isCurrent: session.sessionToken === currentSessionToken,
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const supabase = await createServerActionClient();

  // Type assertion needed: UserSession table added via migration
  const { error } = await (supabase.from('UserSession') as ReturnType<typeof supabase.from>)
    .update({ revokedAt: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('userId', userId);

  if (error) {
    logger.error('Failed to revoke session', new Error(error.message), { userId, sessionId });
    return false;
  }

  return true;
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentAccessToken: string
): Promise<number> {
  const supabase = await createServerActionClient();
  const currentSessionToken = getSessionToken(currentAccessToken);

  // Type assertion needed: UserSession table added via migration
  const { data, error } = await (supabase.from('UserSession') as ReturnType<typeof supabase.from>)
    .update({ revokedAt: new Date().toISOString() })
    .eq('userId', userId)
    .is('revokedAt', null)
    .neq('sessionToken', currentSessionToken)
    .select('id') as { data: Array<{ id: string }> | null; error: Error | null };

  if (error) {
    logger.error('Failed to revoke other sessions', new Error(error.message), { userId });
    throw new Error('Failed to revoke sessions');
  }

  return data?.length || 0;
}

/**
 * Clean up old/revoked sessions (for CRON job)
 * Removes sessions older than 30 days or revoked more than 7 days ago
 */
export async function cleanupOldSessions(): Promise<number> {
  const supabase = await createServerActionClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Type assertion needed: UserSession table added via migration
  const sessionTable = supabase.from('UserSession') as ReturnType<typeof supabase.from>;

  // Delete old inactive sessions
  const { data: inactiveSessions } = await sessionTable
    .delete()
    .lt('lastActive', thirtyDaysAgo.toISOString())
    .is('revokedAt', null)
    .select('id') as { data: Array<{ id: string }> | null };

  // Delete old revoked sessions
  const { data: revokedSessions } = await sessionTable
    .delete()
    .lt('revokedAt', sevenDaysAgo.toISOString())
    .select('id') as { data: Array<{ id: string }> | null };

  const deletedCount = (inactiveSessions?.length || 0) + (revokedSessions?.length || 0);

  if (deletedCount > 0) {
    logger.info('Cleaned up old sessions', { deletedCount });
  }

  return deletedCount;
}
