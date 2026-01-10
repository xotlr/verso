import { z } from "zod"
import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { logTeamAction } from "@/lib/audit-log"

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: { select: { projects: true, members: true, invites: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return teams
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createTeamSchema,
  handler: async ({ user, data }) => {
    const { name, description, logo } = data

    const team = await prisma.team.create({
      data: {
        name,
        description,
        logo,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: { select: { projects: true, members: true, invites: true } },
      },
    })

    await logTeamAction({
      teamId: team.id,
      actorId: user.id,
      action: "team_created",
      metadata: { name, description, logo },
    })

    return team
  },
})
