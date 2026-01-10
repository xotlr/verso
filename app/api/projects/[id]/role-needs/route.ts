import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

const createRoleNeedSchema = z.object({
  role: z.string().min(1, "Role is required"),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().default(false),
})

// GET - Mixed auth (public projects don't require auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { isPublic: true, userId: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const session = await auth()
    const isOwner = session?.user?.id === project.userId

    if (!project.isPublic) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const hasAccess = await hasProjectAccess(projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    }

    const roleNeeds = await prisma.projectRoleNeed.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      ...(isOwner ? {
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
      } : {}),
    })

    return NextResponse.json(roleNeeds)
  } catch (error) {
    logger.error("Failed to fetch role needs", error instanceof Error ? error : undefined, {
      projectId,
    })
    return NextResponse.json({ error: "Failed to fetch role needs" }, { status: 500 })
  }
}

export const POST = createApiHandler({
  auth: "required",
  schema: createRoleNeedSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can add role needs")
    }

    const roleNeed = await prisma.projectRoleNeed.create({
      data: {
        projectId,
        role: data.role,
        description: data.description,
        location: data.location,
        isPaid: data.isPaid,
      },
    })

    return roleNeed
  },
})
