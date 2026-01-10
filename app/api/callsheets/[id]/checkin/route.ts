import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
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

const checkInSchema = z.object({
  crewName: z.string().min(1).max(255),
  department: z.string().min(1).max(100),
  notes: z.string().max(500).optional().nullable(),
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

    const checkIns = await prisma.crewCheckIn.findMany({
      where: { callsheetId: id },
      orderBy: { checkedInAt: "desc" },
    })

    return { checkIns }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: checkInSchema,
  handler: async ({ user, params, data }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const existingCheckIn = await prisma.crewCheckIn.findUnique({
      where: {
        callsheetId_crewName: { callsheetId: id, crewName: data.crewName },
      },
    })
    const isNewCheckIn = !existingCheckIn

    const checkIn = await prisma.crewCheckIn.upsert({
      where: {
        callsheetId_crewName: { callsheetId: id, crewName: data.crewName },
      },
      update: {
        checkedInAt: new Date(),
        checkedInBy: user.id,
        notes: data.notes,
      },
      create: {
        callsheetId: id,
        crewName: data.crewName,
        department: data.department,
        checkedInBy: user.id,
        notes: data.notes,
      },
    })

    if (isNewCheckIn && access.callsheet) {
      const callsheetOwnerId = access.callsheet.userId
      if (callsheetOwnerId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: callsheetOwnerId,
            type: "checkin",
            title: `${data.crewName} checked in`,
            body: `${data.department}`,
            data: {
              callsheetId: id,
              crewName: data.crewName,
              department: data.department,
            },
          },
        })
      }
    }

    return { checkIn }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const crewName = searchParams.get("crewName")

    if (!crewName) {
      throw new BadRequestError("crewName query parameter required")
    }

    await prisma.crewCheckIn.delete({
      where: {
        callsheetId_crewName: { callsheetId: id, crewName },
      },
    })

    return { success: true }
  },
})
