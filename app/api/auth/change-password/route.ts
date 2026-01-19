import { z } from "zod"
import { createApiHandler, BadRequestError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hashPassword, comparePassword } from "@/lib/password"
import { checkPasswordBreach } from "@/lib/password-security"
import { logPasswordChanged } from "@/lib/security-events"
import { getClientIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: changePasswordSchema,
  rateLimit: RATE_LIMITS.AUTH,
  handler: async ({ user, request, data, supabase }) => {
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    // 1. Get user's current password hash
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, password")
      .eq("id", user.id)
      .single() as { data: { id: string; password: string | null } | null; error: unknown }

    if (userError) handleSupabaseError(userError as { code?: string; message?: string }, "User")

    if (!userData?.password) {
      // User signed up with OAuth and has no password
      throw new BadRequestError(
        "Cannot change password for accounts created with Google Sign-In. " +
        "Please use Google to sign in."
      )
    }

    // 2. Verify current password
    const isCurrentValid = await comparePassword(data.currentPassword, userData.password)
    if (!isCurrentValid) {
      logger.security("Password change failed: incorrect current password", {
        userId: user.id,
        ip: clientIp,
      })
      throw new BadRequestError("Current password is incorrect")
    }

    // 3. Ensure new password is different from current
    const isSamePassword = await comparePassword(data.newPassword, userData.password)
    if (isSamePassword) {
      throw new BadRequestError("New password must be different from current password")
    }

    // 4. Check new password against breached passwords
    const breachCheck = await checkPasswordBreach(data.newPassword)
    if (breachCheck.isBreached) {
      logger.security("Password change blocked: breached password", {
        userId: user.id,
        breachCount: breachCheck.breachCount,
        ip: clientIp,
      })
      throw new BadRequestError(
        "This password has been found in data breaches. Please choose a different password."
      )
    }

    // 5. Hash new password
    const hashedPassword = await hashPassword(data.newPassword)

    // 6. Update password in database
    const { error: updateError } = await supabase
      .from("User")
      .update({ password: hashedPassword })
      .eq("id", user.id)

    if (updateError) handleSupabaseError(updateError as { code?: string; message?: string }, "User")

    // 7. Invalidate all other sessions by signing out globally
    // This forces re-authentication on all devices
    try {
      // Sign out all sessions except current
      // Note: Supabase's signOut with scope: 'global' signs out ALL sessions including current
      // We do this server-side to ensure all sessions are invalidated
      const { error: signOutError } = await supabase.auth.admin.signOut(user.id, 'global')

      if (signOutError) {
        // Log but don't fail - password was already changed
        logger.warn("Failed to invalidate sessions after password change", {
          userId: user.id,
          error: signOutError.message,
        })
      }
    } catch (error) {
      // Admin API may not be available in all environments
      logger.warn("Session invalidation not available", {
        userId: user.id,
      })
    }

    // 8. Log the security event
    void logPasswordChanged(user.id, clientIp, userAgent)

    logger.info("Password changed successfully", { userId: user.id })

    return {
      success: true,
      message: "Password changed successfully. You may need to sign in again on other devices.",
    }
  },
})
