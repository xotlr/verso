import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        include: { members: { where: { userId } } },
      },
    },
  })

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team && project.team.members.length > 0) return true

  return false
}

const createCallsheetSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  shootDate: z.string().datetime(),
  callTime: z.string().datetime(),
  wrapTime: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]).optional(),
  primaryLocation: z.string().max(255).optional().nullable(),
  data: z.any().optional(),
  weatherForecast: z.string().max(255).optional().nullable(),
  weatherTemp: z.number().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const callsheets = await prisma.callsheet.findMany({
      where: { projectId },
      orderBy: { shootDate: "asc" },
      select: {
        id: true,
        title: true,
        shootDate: true,
        callTime: true,
        wrapTime: true,
        status: true,
        primaryLocation: true,
        weatherForecast: true,
        weatherTemp: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return callsheets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createCallsheetSchema,
  handler: async ({ user, params, data }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const callsheet = await prisma.callsheet.create({
      data: {
        title: data.title,
        shootDate: new Date(data.shootDate),
        callTime: new Date(data.callTime),
        wrapTime: data.wrapTime ? new Date(data.wrapTime) : null,
        status: data.status || "DRAFT",
        primaryLocation: data.primaryLocation,
        data: data.data,
        weatherForecast: data.weatherForecast,
        weatherTemp: data.weatherTemp,
        userId: user.id,
        projectId,
      },
    })

    return callsheet
  },
})
