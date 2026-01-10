import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function checkCallsheetAccess(callsheetId: string, userId: string) {
  const callsheet = await prisma.callsheet.findUnique({
    where: { id: callsheetId },
    include: {
      project: {
        include: {
          team: {
            include: { members: { where: { userId } } },
          },
        },
      },
    },
  })

  if (!callsheet) {
    return { allowed: false, notFound: true, callsheet: null }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, notFound: false, callsheet }
  }

  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, notFound: false, callsheet }
  }

  return { allowed: false, notFound: false, callsheet: null }
}

const updateCallsheetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  shootDate: z.string().datetime().optional(),
  callTime: z.string().datetime().optional(),
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
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const callsheet = await prisma.callsheet.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return callsheet
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateCallsheetSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const previousCallsheet = access.callsheet

    const callsheet = await prisma.callsheet.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.shootDate !== undefined && { shootDate: new Date(data.shootDate) }),
        ...(data.callTime !== undefined && { callTime: new Date(data.callTime) }),
        ...(data.wrapTime !== undefined && {
          wrapTime: data.wrapTime ? new Date(data.wrapTime) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.primaryLocation !== undefined && { primaryLocation: data.primaryLocation }),
        ...(data.data !== undefined && { data: data.data }),
        ...(data.weatherForecast !== undefined && { weatherForecast: data.weatherForecast }),
        ...(data.weatherTemp !== undefined && { weatherTemp: data.weatherTemp }),
      },
      include: {
        project: {
          include: {
            team: { include: { members: true } },
          },
        },
      },
    })

    if (data.status === "PUBLISHED" && previousCallsheet?.status !== "PUBLISHED") {
      const teamMembers = callsheet.project?.team?.members || []
      const notificationPromises = teamMembers
        .filter((m) => m.userId !== user.id)
        .map((member) =>
          prisma.notification.create({
            data: {
              userId: member.userId,
              type: "callsheet_update",
              title: "Callsheet Published",
              body: `${callsheet.title} is now available`,
              data: {
                callsheetId: callsheet.id,
                projectId: callsheet.projectId,
              },
            },
          })
        )
      await Promise.all(notificationPromises)
    }

    return callsheet
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    await prisma.callsheet.delete({
      where: { id },
    })

    return { success: true }
  },
})
