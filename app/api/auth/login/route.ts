import { z } from "zod"
import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { checkLockoutStatus, recordFailedAttempt, clearFailedAttempts } from "@/lib/account-lockout"
import { logLoginSuccess, logLoginFailed } from "@/lib/security-events"
import { createServerActionClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
})

export const POST = createApiHandler({
  auth: "none",
  schema: loginSchema,
  handler: async ({ request, data }) => {
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    // 1. IP-based rate limiting (defense against distributed attacks)
    const rateLimitResult = await rateLimit(`login:${clientIp}`, RATE_LIMITS.AUTH)
    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many login attempts. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    // 2. Account-based lockout check (defense against targeted attacks)
    const lockoutStatus = await checkLockoutStatus(data.email)
    if (lockoutStatus.isLocked) {
      // Log the attempt even though account is locked
      void logLoginFailed(null, "account_locked", clientIp, userAgent, data.email)

      throw new RateLimitError(
        "Account temporarily locked due to too many failed attempts. Please try again later.",
        lockoutStatus.retryAfterSeconds || 900
      )
    }

    // 3. Attempt login via Supabase Auth
    const supabase = await createServerActionClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      // Record failed attempt
      const newStatus = await recordFailedAttempt(data.email)

      // Get user ID if exists (for logging)
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("email", data.email.toLowerCase())
        .single() as { data: { id: string } | null }

      // Log the failed attempt
      void logLoginFailed(
        userData?.id || null,
        authError.message,
        clientIp,
        userAgent,
        data.email
      )

      // Return appropriate error message
      if (newStatus.isLocked) {
        throw new RateLimitError(
          "Account temporarily locked due to too many failed attempts. Please try again later.",
          newStatus.retryAfterSeconds || 900
        )
      }

      // Generic error message (don't reveal if email exists)
      const attemptsRemaining = newStatus.remainingAttempts
      const message = attemptsRemaining <= 2
        ? `Invalid email or password. ${attemptsRemaining} attempts remaining before lockout.`
        : "Invalid email or password."

      throw new BadRequestError(message)
    }

    // 4. Success - clear failed attempts
    await clearFailedAttempts(data.email)

    // Get internal user ID for logging
    const { data: userData } = await supabase
      .from("User")
      .select("id")
      .eq("authId", authData.user.id)
      .single() as { data: { id: string } | null }

    if (userData?.id) {
      void logLoginSuccess(userData.id, "credentials", clientIp, userAgent)
    }

    // Session cookies are automatically set by Supabase via the setAll callback
    // in createServerActionClient. Never expose tokens in JSON responses.
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    }
  },
})
