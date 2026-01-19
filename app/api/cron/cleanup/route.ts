import { createApiHandler, UnauthorizedError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { timingSafeEqual } from "crypto"

/**
 * Constant-time comparison for secret tokens.
 * Prevents timing attacks by always comparing in the same time regardless of match.
 */
function secureTokenCompare(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Cleanup CRON endpoint - runs periodic maintenance tasks
 *
 * Tasks:
 * 1. Delete ProcessedWebhookEvent records older than 90 days
 * 2. Delete expired PasswordResetToken records
 * 3. Delete expired VerificationToken records
 * 4. Clean up stale CollaborationSession records (inactive > 24h)
 *
 * Security: Requires CRON_SECRET bearer token
 */
export const GET = createApiHandler({
  auth: "none",
  handler: async ({ request }) => {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // Validate CRON token
    if (cronSecret) {
      const providedToken = authHeader?.replace("Bearer ", "") || ""
      if (!secureTokenCompare(providedToken, cronSecret)) {
        throw new UnauthorizedError()
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new UnauthorizedError()
    }

    const supabase = await createServerActionClient()
    const errors: string[] = []

    // 1. Clean up old webhook events (90 days retention)
    const webhookCutoff = new Date()
    webhookCutoff.setDate(webhookCutoff.getDate() - 90)

    const { error: webhookError } = await supabase
      .from("ProcessedWebhookEvent")
      .delete()
      .lt("processedAt", webhookCutoff.toISOString())

    if (webhookError) {
      logger.error("Failed to cleanup webhook events", undefined, { error: webhookError })
      errors.push("webhookEvents")
    } else {
      logger.info("Cleaned up old webhook events (>90 days)")
    }

    // 2. Clean up expired password reset tokens
    const { error: passwordTokenError } = await supabase
      .from("PasswordResetToken")
      .delete()
      .lt("expires", new Date().toISOString())

    if (passwordTokenError) {
      logger.error("Failed to cleanup password reset tokens", undefined, { error: passwordTokenError })
      errors.push("passwordTokens")
    } else {
      logger.info("Cleaned up expired password reset tokens")
    }

    // 3. Clean up expired verification tokens
    const { error: verificationTokenError } = await supabase
      .from("VerificationToken")
      .delete()
      .lt("expires", new Date().toISOString())

    if (verificationTokenError) {
      logger.error("Failed to cleanup verification tokens", undefined, { error: verificationTokenError })
      errors.push("verificationTokens")
    } else {
      logger.info("Cleaned up expired verification tokens")
    }

    // 4. Clean up stale collaboration sessions (inactive > 24 hours)
    const sessionCutoff = new Date()
    sessionCutoff.setHours(sessionCutoff.getHours() - 24)

    const { error: sessionError } = await supabase
      .from("collaboration_sessions")
      .delete()
      .lt("last_seen", sessionCutoff.toISOString())

    if (sessionError) {
      logger.error("Failed to cleanup collaboration sessions", undefined, { error: sessionError })
      errors.push("collaborationSessions")
    } else {
      logger.info("Cleaned up stale collaboration sessions (>24h)")
    }

    // 5. Clean up old security events (90 days retention)
    const securityEventCutoff = new Date()
    securityEventCutoff.setDate(securityEventCutoff.getDate() - 90)

    const { error: securityEventError } = await supabase
      .from("SecurityEvent")
      .delete()
      .lt("createdAt", securityEventCutoff.toISOString())

    if (securityEventError) {
      logger.error("Failed to cleanup security events", undefined, { error: securityEventError })
      errors.push("securityEvents")
    } else {
      logger.info("Cleaned up old security events (>90 days)")
    }

    logger.info("Cleanup CRON completed", { errors: errors.length > 0 ? errors : "none" })

    return {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
      tasksRun: ["webhookEvents", "passwordTokens", "verificationTokens", "collaborationSessions", "securityEvents"],
    }
  },
})

export const dynamic = "force-dynamic"
export const maxDuration = 60
