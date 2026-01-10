import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { team: { members: { some: { userId: user.id } } } },
        ],
      },
    })

    if (!project) {
      throw new NotFoundError("Project")
    }

    const invites = await prisma.projectRoleInvite.findMany({
      where: {
        projectId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return invites
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createInviteSchema,
  handler: async ({ user, params, data, request }) => {
    const { id: projectId } = params

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { team: { members: { some: { userId: user.id } } } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!project) {
      throw new NotFoundError("Project")
    }

    const { email, role } = data
    const normalizedEmail = email.toLowerCase()

    const existingRole = await prisma.projectRole.findFirst({
      where: {
        projectId,
        role,
        user: { email: normalizedEmail },
      },
    })

    if (existingRole) {
      throw new BadRequestError("User already has this role on the project")
    }

    const existingInvite = await prisma.projectRoleInvite.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
        role,
        expiresAt: { gt: new Date() },
      },
    })

    if (existingInvite) {
      throw new BadRequestError("An invite for this email and role is already pending")
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.projectRoleInvite.create({
      data: {
        projectId,
        email: normalizedEmail,
        role,
        expiresAt,
        invitedBy: user.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/project-invite/${invite.token}`

    return {
      ...invite,
      inviteUrl,
    }
  },
})
