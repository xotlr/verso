import { createApiHandler, NotFoundError, ForbiddenError, GoneError } from "@/lib/api"
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
  handler: async ({ params, supabase }) => {
    const { token } = params

    const { data: shareLink, error } = await supabase
      .from("CallsheetShareLink")
      .select(`
        *,
        callsheet:Callsheet!callsheetId(
          id,
          title,
          shootDate,
          callTime,
          wrapTime,
          status,
          primaryLocation,
          weatherForecast,
          weatherTemp,
          data,
          project:Project!projectId(id, name)
        ),
        user:User!userId(name)
      `)
      .eq("token", token)
      .single()

    if (error?.code === "PGRST116" || !shareLink) {
      throw new NotFoundError("Callsheet share link not found")
    }
    if (error) throw error

    if (!shareLink.isActive) {
      throw new GoneError("This share link has been revoked")
    }

    if (shareLink.expiresAt && new Date() > new Date(shareLink.expiresAt)) {
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
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    const { data: shareLink, error: fetchError } = await supabase
      .from("CallsheetShareLink")
      .select("id, userId")
      .eq("token", token)
      .single()

    if (fetchError?.code === "PGRST116" || !shareLink) {
      throw new NotFoundError("Share link")
    }
    if (fetchError) throw fetchError

    if (shareLink.userId !== user.id) {
      throw new ForbiddenError("Access denied")
    }

    const { error: updateError } = await supabase
      .from("CallsheetShareLink")
      .update({ isActive: false })
      .eq("token", token)

    if (updateError) throw updateError

    return { success: true }
  },
})
