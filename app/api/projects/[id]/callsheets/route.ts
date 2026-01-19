import { z } from "zod"
import { createApiHandler, NotFoundError } from "@/lib/api"

async function hasProjectAccess(projectId: string, userId: string, supabase: any): Promise<boolean> {
  const { data: project } = await supabase
    .from("Project")
    .select(`
      id, userId, teamId,
      team:Team(id, members:TeamMember(userId))
    `)
    .eq("id", projectId)
    .single()

  if (!project) return false
  if (project.userId === userId) return true
  if (project.team?.members?.some((m: { userId: string }) => m.userId === userId)) return true

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
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: callsheets, error } = await supabase
      .from("Callsheet")
      .select("id, title, shootDate, callTime, wrapTime, status, primaryLocation, weatherForecast, weatherTemp, createdAt, updatedAt")
      .eq("projectId", projectId)
      .order("shootDate", { ascending: true })

    if (error) throw error

    return callsheets
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createCallsheetSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(projectId, user.id, supabase)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: callsheet, error } = await supabase
      .from("Callsheet")
      .insert({
        title: data.title,
        shootDate: data.shootDate,
        callTime: data.callTime,
        wrapTime: data.wrapTime || null,
        status: data.status || "DRAFT",
        primaryLocation: data.primaryLocation,
        data: data.data,
        weatherForecast: data.weatherForecast,
        weatherTemp: data.weatherTemp,
        userId: user.id,
        projectId,
      })
      .select()
      .single()

    if (error) throw error

    return callsheet
  },
})
