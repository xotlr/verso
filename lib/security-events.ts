/**
 * Security Event Logging
 *
 * Tracks security-relevant user events for audit trail and anomaly detection.
 * All logging is fire-and-forget to avoid blocking auth operations.
 *
 * SECURITY: Provides login history and security audit trail
 */

import { createServerActionClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "oauth_login"
  | "oauth_linked"
  | "email_changed"
  | "account_deleted"
  | "suspicious_activity";

export interface SecurityEventMetadata {
  provider?: string; // OAuth provider (google, github, etc.)
  reason?: string; // Failure reason
  oldEmail?: string; // For email changes (masked)
  newEmail?: string; // For email changes (masked)
  [key: string]: unknown;
}

export interface LogSecurityEventParams {
  userId: string;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: SecurityEventMetadata;
}

/**
 * Mask email for logging (shows first 2 chars and domain)
 * Example: "johndoe@example.com" -> "jo***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const masked = local.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}

/**
 * Log a security event for audit purposes.
 * This is fire-and-forget - errors are logged but don't throw.
 *
 * @param params - Event parameters
 */
export async function logSecurityEvent(params: LogSecurityEventParams): Promise<void> {
  const { userId, eventType, ipAddress, userAgent, metadata } = params;

  try {
    const supabase = await createServerActionClient();

    // Mask any email fields in metadata for privacy
    const safeMetadata = metadata ? { ...metadata } : {};
    if (safeMetadata.oldEmail) {
      safeMetadata.oldEmail = maskEmail(safeMetadata.oldEmail);
    }
    if (safeMetadata.newEmail) {
      safeMetadata.newEmail = maskEmail(safeMetadata.newEmail);
    }

    // Type assertion needed since SecurityEvent table is added via migration
    const { error } = await (supabase.from("SecurityEvent") as ReturnType<typeof supabase.from>).insert({
      userId,
      eventType,
      ipAddress,
      userAgent: userAgent?.substring(0, 500), // Truncate long user agents
      metadata: safeMetadata,
    });

    if (error) {
      logger.error("Failed to log security event", undefined, {
        userId,
        eventType,
        error: error.message,
      });
    }

    // Also log to structured logger for centralized monitoring
    logger.security(`Security event: ${eventType}`, {
      userId,
      eventType,
      ip: ipAddress,
      metadata: safeMetadata,
    });
  } catch (error) {
    // Don't throw - security logging shouldn't break auth
    logger.error("Security event logging failed", error instanceof Error ? error : undefined, {
      userId,
      eventType,
    });
  }
}

/**
 * Log a successful login event.
 */
export async function logLoginSuccess(
  userId: string,
  provider: "credentials" | "oauth",
  ipAddress?: string,
  userAgent?: string,
  oauthProvider?: string
): Promise<void> {
  const eventType = provider === "oauth" ? "oauth_login" : "login_success";
  await logSecurityEvent({
    userId,
    eventType,
    ipAddress,
    userAgent,
    metadata: oauthProvider ? { provider: oauthProvider } : undefined,
  });
}

/**
 * Log a failed login attempt.
 * Note: For failed logins, we may not have a userId if email doesn't exist.
 * In that case, use a placeholder or hash of the attempted email.
 */
export async function logLoginFailed(
  userId: string | null,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
  attemptedEmail?: string
): Promise<void> {
  // For unknown users, we can't log to the security events table
  // Instead, we just log to the centralized logger
  if (!userId) {
    logger.security("Login failed for unknown user", {
      reason,
      ip: ipAddress,
      attemptedEmail: attemptedEmail ? maskEmail(attemptedEmail) : undefined,
    });
    return;
  }

  await logSecurityEvent({
    userId,
    eventType: "login_failed",
    ipAddress,
    userAgent,
    metadata: { reason },
  });
}

/**
 * Log a logout event.
 */
export async function logLogout(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "logout",
    ipAddress,
    userAgent,
  });
}

/**
 * Log a password change event.
 */
export async function logPasswordChanged(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "password_changed",
    ipAddress,
    userAgent,
  });
}

/**
 * Log a password reset request.
 */
export async function logPasswordResetRequested(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "password_reset_requested",
    ipAddress,
    userAgent,
  });
}

/**
 * Log a password reset completion.
 */
export async function logPasswordResetCompleted(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "password_reset_completed",
    ipAddress,
    userAgent,
  });
}

/**
 * Log an account deletion.
 */
export async function logAccountDeleted(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "account_deleted",
    ipAddress,
    userAgent,
  });
}

/**
 * Log suspicious activity detected.
 */
export async function logSuspiciousActivity(
  userId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
  additionalMetadata?: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent({
    userId,
    eventType: "suspicious_activity",
    ipAddress,
    userAgent,
    metadata: { reason, ...additionalMetadata },
  });
}

/**
 * Get recent security events for a user.
 * Used for "recent login history" display in settings.
 */
export async function getRecentSecurityEvents(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  eventType: SecurityEventType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: SecurityEventMetadata | null;
  createdAt: string;
}>> {
  try {
    const supabase = await createServerActionClient();

    // Type assertion needed since SecurityEvent table is added via migration
    const { data, error } = await (supabase.from("SecurityEvent") as ReturnType<typeof supabase.from>)
      .select("id, eventType, ipAddress, userAgent, metadata, createdAt")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Failed to fetch security events", undefined, {
        userId,
        error: error.message,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Security events fetch failed", error instanceof Error ? error : undefined, {
      userId,
    });
    return [];
  }
}
