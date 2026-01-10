import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { DEFAULT_ACTS } from "@/types/beat-board"

const actConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const actsSchema = z.array(actConfigSchema).min(1).max(10)

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    return access.screenplay?.acts || DEFAULT_ACTS
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: actsSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const screenplay = await prisma.screenplay.update({
      where: { id },
      data: { acts: data },
      select: { acts: true },
    })

    return screenplay.acts
  },
})
