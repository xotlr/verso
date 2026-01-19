import { z } from "zod"
import { createApiHandler, RateLimitError } from "@/lib/api"
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { logPasswordResetRequested } from "@/lib/security-events"
import crypto from "crypto"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const POST = createApiHandler({
  auth: "none",
  schema: forgotPasswordSchema,
  handler: async ({ request, data, supabase }) => {
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`forgot-password:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    const normalizedEmail = data.email.toLowerCase().trim()

    const { data: user } = await supabase
      .from("User")
      .select("id, email, password")
      .eq("email", normalizedEmail)
      .single()

    if (user?.email && user.password) {
      // Delete any existing tokens for this email
      await supabase
        .from("PasswordResetToken")
        .delete()
        .eq("email", normalizedEmail)

      const token = crypto.randomBytes(32).toString("hex")
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const { error: createError } = await supabase
        .from("PasswordResetToken")
        .insert({
          email: normalizedEmail,
          token,
          expires,
        })

      if (!createError) {
        // Log the security event (fire-and-forget)
        const userAgent = request.headers.get("user-agent") || undefined
        void logPasswordResetRequested(user.id, ip, userAgent)

        await sendPasswordResetEmail(normalizedEmail, token)
      }
    }

    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    }
  },
})

async function sendPasswordResetEmail(email: string, token: string) {
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || "noreply@verso.ac"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verso.ac"

  if (!resendApiKey) {
    logger.warn("RESEND_API_KEY not configured, skipping email send")
    return
  }

  const resetUrl = `${appUrl}/reset-password?token=${token}`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: email,
        subject: "Reset your Verso password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111;">Reset your password</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 24px;">
              You requested a password reset for your Verso account. Click the button below to choose a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 32px; line-height: 1.6;">
              This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              Verso - Professional screenwriting software
            </p>
          </div>
        `,
        text: `Reset your Verso password\n\nYou requested a password reset. Visit this link to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.error("Resend API error", undefined, { errorData })
    }
  } catch (error) {
    logger.error("Failed to send password reset email", error instanceof Error ? error : undefined)
  }
}
