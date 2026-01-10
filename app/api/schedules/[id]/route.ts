import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

async function checkScheduleAccess(scheduleId: string, userId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
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

  if (!schedule) {
    return { allowed: false, notFound: true, schedule: null }
  }

  if (schedule.userId === userId) {
    return { allowed: true, notFound: false, schedule }
  }

  if (schedule.project?.team && schedule.project.team.members.length > 0) {
    return { allowed: true, notFound: false, schedule }
  }

  return { allowed: false, notFound: false, schedule: null }
}

const updateScheduleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  data: z.any().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    return access.schedule
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateScheduleSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.data !== undefined && { data: data.data }),
      },
    })

    return schedule
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScheduleAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Schedule")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    await prisma.schedule.delete({
      where: { id },
    })

    return { success: true }
  },
})
