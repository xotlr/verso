import { z } from "zod"
import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import { hashPassword } from "@/lib/password"
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export const POST = createApiHandler({
  auth: "none",
  schema: signupSchema,
  handler: async ({ request, data, supabase }) => {
    const clientIp = getClientIp(request)
    const rateLimitResult = await rateLimit(`signup:${clientIp}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many signup attempts. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    const { data: existingUser } = await supabase
      .from("User")
      .select("id")
      .eq("email", data.email)
      .single()

    if (existingUser) {
      throw new BadRequestError("An account with this email already exists")
    }

    const hashedPassword = await hashPassword(data.password)

    const { data: user, error } = await supabase
      .from("User")
      .insert({
        name: data.name,
        email: data.email,
        password: hashedPassword,
      })
      .select("id, name, email")
      .single()

    if (error) throw error

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    }
  },
})
