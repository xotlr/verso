import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

const updateStackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  projectId: z.string().nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const stack = await prisma.stack.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        project: { select: { id: true, name: true } },
        screenplays: {
          select: {
            id: true,
            title: true,
            wordCount: true,
            updatedAt: true,
            type: true,
            genre: true,
            logline: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        _count: { select: { screenplays: true } },
      },
    })

    if (!stack) {
      throw new NotFoundError("Stack")
    }

    return stack
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateStackSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params
    const { name, projectId } = data

    const existingStack = await prisma.stack.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingStack) {
      throw new NotFoundError("Stack")
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      })
      if (!project) {
        throw new ForbiddenError("Project not found or access denied")
      }
    }

    const stack = await prisma.stack.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(projectId !== undefined && { projectId }),
      },
      include: {
        screenplays: {
          select: { id: true, title: true, wordCount: true, updatedAt: true },
        },
        project: { select: { id: true, name: true } },
        _count: { select: { screenplays: true } },
      },
    })

    return stack
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const existingStack = await prisma.stack.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingStack) {
      throw new NotFoundError("Stack")
    }

    await prisma.screenplay.updateMany({
      where: { stackId: id },
      data: { stackId: null },
    })

    await prisma.stack.delete({ where: { id } })

    return { success: true }
  },
})
