import { createApiHandler, NotFoundError, ForbiddenError, GoneError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import type { CallsheetData, CrewMember } from "@/types/callsheet"

function filterCallsheetData(
  data: CallsheetData | null,
  filterType: string,
  filterValue: string | null
): CallsheetData | null {
  if (!data || filterType === "all" || !filterValue) {
    return data
  }

  const normalizedFilter = filterValue.toLowerCase().trim()

  if (filterType === "department") {
    return {
      ...data,
      crew:
        data.crew?.filter(
          (member: CrewMember) => member.department.toLowerCase() === normalizedFilter
        ) || [],
    }
  }

  if (filterType === "person") {
    return {
      ...data,
      crew:
        data.crew?.filter((member: CrewMember) =>
          member.name.toLowerCase().includes(normalizedFilter)
        ) || [],
    }
  }

  return data
}

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ params }) => {
    const { token } = params

    const shareLink = await prisma.callsheetShareLink.findUnique({
      where: { token },
      include: {
        callsheet: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        user: { select: { name: true } },
      },
    })

    if (!shareLink) {
      throw new NotFoundError("Callsheet share link not found")
    }

    if (!shareLink.isActive) {
      throw new GoneError("This share link has been revoked")
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new GoneError("This share link has expired")
    }

    const { callsheet } = shareLink

    const filteredData = filterCallsheetData(
      callsheet.data as CallsheetData | null,
      shareLink.filterType,
      shareLink.filterValue
    )

    return {
      callsheet: {
        id: callsheet.id,
        title: callsheet.title,
        shootDate: callsheet.shootDate,
        callTime: callsheet.callTime,
        wrapTime: callsheet.wrapTime,
        status: callsheet.status,
        primaryLocation: callsheet.primaryLocation,
        weatherForecast: callsheet.weatherForecast,
        weatherTemp: callsheet.weatherTemp,
        data: filteredData,
        project: callsheet.project,
      },
      filterType: shareLink.filterType,
      filterValue: shareLink.filterValue,
      expiresAt: shareLink.expiresAt,
      createdBy: shareLink.user.name,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { token } = params

    const shareLink = await prisma.callsheetShareLink.findUnique({
      where: { token },
    })

    if (!shareLink) {
      throw new NotFoundError("Share link")
    }

    if (shareLink.userId !== user.id) {
      throw new ForbiddenError("Access denied")
    }

    await prisma.callsheetShareLink.update({
      where: { token },
      data: { isActive: false },
    })

    return { success: true }
  },
})
