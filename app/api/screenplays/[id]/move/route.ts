import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const moveScreenplaySchema = z.object({
  projectId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
})

export const PUT = createApiHandler({
  auth: "required",
  schema: moveScreenplaySchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
      include: {
        project: { select: { teamId: true } },
        team: { select: { id: true } },
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    let hasAccess = screenplay.userId === user.id

    if (!hasAccess) {
      const teamId = screenplay.teamId || screenplay.project?.teamId
      if (teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: user.id,
            },
          },
        })
        hasAccess = !!membership
      }
    }

    if (!hasAccess) {
      throw new ForbiddenError()
    }

    const { projectId, teamId } = data

    // Validate target project access if moving to a project
    if (projectId) {
      const targetProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, teamId: true },
      })

      if (!targetProject) {
        throw new NotFoundError("Target project")
      }

      let hasProjectAccess = targetProject.userId === user.id

      if (!hasProjectAccess && targetProject.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: targetProject.teamId,
              userId: user.id,
            },
          },
        })
        hasProjectAccess = !!membership
      }

      if (!hasProjectAccess) {
        throw new ForbiddenError("Access denied to target project")
      }
    }

    // Validate target team access if moving to a team
    if (teamId !== undefined && teamId !== null) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id,
          },
        },
      })

      if (!membership) {
        throw new ForbiddenError("Access denied to target team")
      }
    }

    // Build update data - only include fields that were provided
    const updateData: { projectId?: string | null; teamId?: string | null } = {}
    if (projectId !== undefined) {
      updateData.projectId = projectId
    }
    if (teamId !== undefined) {
      updateData.teamId = teamId
    }

    const updatedScreenplay = await prisma.screenplay.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    })

    return updatedScreenplay
  },
})
