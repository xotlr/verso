import { z } from "zod"
import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
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
  handler: async ({ request, data }) => {
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`reset-password:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: data.token },
    })

    if (!resetToken) {
      throw new BadRequestError("Invalid or expired reset link. Please request a new one.")
    }

    if (new Date() > resetToken.expires) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      throw new BadRequestError("This reset link has expired. Please request a new one.")
    }

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      throw new BadRequestError("Invalid reset link. Please request a new one.")
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email: resetToken.email },
      }),
    ])

    return {
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    }
  },
})

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      throw new BadRequestError("Token is required")
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      throw new BadRequestError("Invalid or expired reset link")
    }

    if (new Date() > resetToken.expires) {
      throw new BadRequestError("This reset link has expired")
    }

    return { valid: true }
  },
})
