import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

const updateApplicationSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateApplicationSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId, needId, appId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can update applications")
    }

    const application = await prisma.projectRoleApplication.findFirst({
      where: {
        id: appId,
        roleNeedId: needId,
        roleNeed: {
          projectId,
        },
      },
      include: {
        roleNeed: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!application) {
      throw new NotFoundError("Application")
    }

    const updatedApplication = await prisma.projectRoleApplication.update({
      where: { id: appId },
      data: { status: data.status },
    })

    if (data.status === "ACCEPTED") {
      const existingRole = await prisma.projectRole.findFirst({
        where: {
          projectId,
          userId: application.userId,
          role: application.roleNeed.role,
        },
      })

      if (!existingRole) {
        const unfilledSlot = await prisma.projectRole.findFirst({
          where: {
            projectId,
            role: application.roleNeed.role,
            userId: null,
          },
        })

        if (unfilledSlot) {
          await prisma.projectRole.update({
            where: { id: unfilledSlot.id },
            data: {
              userId: application.userId,
              name: application.user.name || "Team Member",
            },
          })
        } else {
          await prisma.projectRole.create({
            data: {
              projectId,
              role: application.roleNeed.role,
              name: application.user.name || "Team Member",
              userId: application.userId,
            },
          })
        }
      }

      await prisma.activity.create({
        data: {
          userId: user.id,
          type: "role_accepted",
          entityId: projectId,
          entityTitle: `${application.user.name} as ${application.roleNeed.role}`,
        },
      })
    }

    return updatedApplication
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId, needId, appId } = params

    const application = await prisma.projectRoleApplication.findFirst({
      where: {
        id: appId,
        roleNeedId: needId,
        roleNeed: {
          projectId,
        },
      },
    })

    if (!application) {
      throw new NotFoundError("Application")
    }

    if (application.userId !== user.id) {
      throw new ForbiddenError("You can only withdraw your own application")
    }

    if (application.status !== "PENDING") {
      throw new BadRequestError("Can only withdraw pending applications")
    }

    await prisma.projectRoleApplication.delete({
      where: { id: appId },
    })

    return { success: true }
  },
})
