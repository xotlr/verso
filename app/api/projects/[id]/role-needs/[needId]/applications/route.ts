import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, ConflictError, handleSupabaseError } from "@/lib/api"
import { RATE_LIMITS } from "@/lib/rate-limit"
import { createServerActionClient } from "@/lib/supabase/server"

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerActionClient()

  const result = await supabase
    .from("Project")
    .select("userId")
    .eq("id", projectId)
    .single()

  const project = result.data as { userId: string } | null
  return project?.userId === userId
}

const createApplicationSchema = z.object({
  message: z.string().max(1000).optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, needId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can view applications")
    }

    const { data: roleNeed, error: needError } = await supabase
      .from("ProjectRoleNeed")
      .select("id")
      .eq("id", needId)
      .eq("projectId", projectId)
      .single()

    if (needError?.code === "PGRST116" || !roleNeed) {
      throw new NotFoundError("Role need")
    }
    if (needError) handleSupabaseError(needError, "RoleNeed")

    const { data: applications, error } = await supabase
      .from("ProjectRoleApplication")
      .select(`
        id,
        message,
        status,
        createdAt,
        user:User!userId(
          id,
          name,
          image,
          title,
          bio,
          location
        )
      `)
      .eq("roleNeedId", needId)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Application")

    return { applications: applications || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createApplicationSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, needId } = params

    const { data: roleNeed, error: needError } = await supabase
      .from("ProjectRoleNeed")
      .select(`
        id,
        role,
        project:Project!projectId(
          userId,
          name,
          isPublic
        )
      `)
      .eq("id", needId)
      .eq("projectId", projectId)
      .single()

    if (needError?.code === "PGRST116" || !roleNeed) {
      throw new NotFoundError("Role need not found or project is not public")
    }
    if (needError) handleSupabaseError(needError, "RoleNeed")

    const project = roleNeed.project as { userId: string; name: string; isPublic: boolean }

    if (!project.isPublic) {
      throw new NotFoundError("Role need not found or project is not public")
    }

    if (project.userId === user.id) {
      throw new BadRequestError("Cannot apply to your own project's roles")
    }

    const { data: existingApplication } = await supabase
      .from("ProjectRoleApplication")
      .select("id")
      .eq("roleNeedId", needId)
      .eq("userId", user.id)
      .single()

    if (existingApplication) {
      throw new ConflictError("You have already applied for this role")
    }

    const { data: application, error: createError } = await supabase
      .from("ProjectRoleApplication")
      .insert({
        roleNeedId: needId,
        userId: user.id,
        message: data.message || null,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Application")

    // Create activity
    await supabase
      .from("Activity")
      .insert({
        userId: user.id,
        type: "role_application",
        entityId: projectId,
        entityTitle: project.name,
      })

    return application
  },
})
