import { z } from "zod"
import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import bcrypt from "bcryptjs"
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export const POST = createApiHandler({
  auth: "none",
  schema: resetPasswordSchema,
  handler: async ({ request, data, supabase }) => {
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`reset-password:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    const { data: resetToken, error: tokenError } = await supabase
      .from("PasswordResetToken")
      .select("*")
      .eq("token", data.token)
      .single()

    if (tokenError?.code === "PGRST116" || !resetToken) {
      throw new BadRequestError("Invalid or expired reset link. Please request a new one.")
    }

    if (new Date() > new Date(resetToken.expires)) {
      await supabase
        .from("PasswordResetToken")
        .delete()
        .eq("id", resetToken.id)
      throw new BadRequestError("This reset link has expired. Please request a new one.")
    }

    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("email", resetToken.email)
      .single()

    if (userError?.code === "PGRST116" || !user) {
      await supabase
        .from("PasswordResetToken")
        .delete()
        .eq("id", resetToken.id)
      throw new BadRequestError("Invalid reset link. Please request a new one.")
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Update password
    const { error: updateError } = await supabase
      .from("User")
      .update({ password: hashedPassword })
      .eq("id", user.id)

    if (updateError) throw updateError

    // Delete all reset tokens for this email
    await supabase
      .from("PasswordResetToken")
      .delete()
      .eq("email", resetToken.email)

    return {
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    }
  },
})

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ request, supabase }) => {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      throw new BadRequestError("Token is required")
    }

    const { data: resetToken, error } = await supabase
      .from("PasswordResetToken")
      .select("*")
      .eq("token", token)
      .single()

    if (error?.code === "PGRST116" || !resetToken) {
      throw new BadRequestError("Invalid or expired reset link")
    }

    if (new Date() > new Date(resetToken.expires)) {
      throw new BadRequestError("This reset link has expired")
    }

    return { valid: true }
  },
})
