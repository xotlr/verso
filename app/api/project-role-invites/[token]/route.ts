import { createApiHandler, NotFoundError, GoneError, ForbiddenError, BadRequestError, UnauthorizedError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ params }) => {
    const { token } = params

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            logo: true,
            banner: true,
            description: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (new Date() > invite.expiresAt) {
      throw new GoneError("Invite has expired")
    }

    return invite
  },
})

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (new Date() > invite.expiresAt) {
      await prisma.projectRoleInvite.delete({ where: { id: invite.id } })
      throw new GoneError("Invite has expired")
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite is for a different email address")
    }

    const existingRole = await prisma.projectRole.findFirst({
      where: {
        projectId: invite.projectId,
        role: invite.role,
        userId: user.id,
      },
    })

    if (existingRole) {
      await prisma.projectRoleInvite.delete({ where: { id: invite.id } })
      throw new BadRequestError("You already have this role on the project")
    }

    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.projectRole.create({
        data: {
          projectId: invite.projectId,
          role: invite.role,
          name: user.name || user.email!,
          userId: user.id,
        },
        select: {
          id: true,
          role: true,
          name: true,
          userId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      await tx.projectRoleInvite.delete({ where: { id: invite.id } })

      return role
    })

    return {
      success: true,
      role: result,
      project: result.project,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    if (!user.email) {
      throw new UnauthorizedError("Email required")
    }

    const invite = await prisma.projectRoleInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      throw new NotFoundError("Invite")
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite is for a different email address")
    }

    await prisma.projectRoleInvite.delete({ where: { id: invite.id } })

    return { success: true }
  },
})
