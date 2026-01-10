import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const updateRolesSchema = z.object({
  roles: z.record(z.string(), z.string()),
})

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

    const characterMetas = await prisma.characterMeta.findMany({
      where: { screenplayId: id },
    })

    const roles: Record<string, string> = {}
    for (const meta of characterMetas) {
      roles[meta.characterName] = meta.role
    }

    return { roles }
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateRolesSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { roles } = data

    const operations = Object.entries(roles).map(([characterName, role]) =>
      prisma.characterMeta.upsert({
        where: {
          screenplayId_characterName: {
            screenplayId: id,
            characterName,
          },
        },
        update: { role },
        create: {
          screenplayId: id,
          characterName,
          role,
        },
      })
    )

    await prisma.$transaction(operations)

    return { success: true, roles }
  },
})
