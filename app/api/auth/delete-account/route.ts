import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: deleteAccountSchema,
  handler: async ({ user, data }) => {
    // Verify the confirmation text matches
    if (data.confirmation !== "DELETE MY ACCOUNT") {
      return { error: "Invalid confirmation", status: 400 }
    }

    logger.info("Account deletion requested", { userId: user.id })

    try {
      // Delete user and all related data (cascade delete handles most relations)
      // Some tables need explicit deletion due to relation structure
      await prisma.$transaction(async (tx) => {
        // Delete password reset tokens
        await tx.passwordResetToken.deleteMany({
          where: { email: user.email || "" },
        })

        // Delete sessions (NextAuth)
        await tx.session.deleteMany({
          where: { userId: user.id },
        })

        // Delete accounts (OAuth connections)
        await tx.account.deleteMany({
          where: { userId: user.id },
        })

        // Delete the user (cascades to screenplays, projects, etc.)
        await tx.user.delete({
          where: { id: user.id },
        })
      })

      logger.info("Account deleted successfully", { userId: user.id })

      return {
        success: true,
        message: "Your account has been deleted. You will be logged out.",
      }
    } catch (error) {
      logger.error("Failed to delete account", error instanceof Error ? error : undefined, {
        userId: user.id,
      })
      throw error
    }
  },
})
