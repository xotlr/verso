import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, ConflictError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { hasProjectAccess, requirePermission } from "@/lib/project-access"

const createRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
  name: z.string().optional(),
  userId: z.string().optional().nullable(),
  assignSelf: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const hasAccess = await hasProjectAccess(supabase, projectId, user.id)
    if (!hasAccess) {
      throw new NotFoundError("Project")
    }

    const { data: roles, error } = await supabase
      .from("ProjectRole")
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .eq("projectId", projectId)
      .order("role", { ascending: true })

    if (error) handleSupabaseError(error, "Role")

    return roles || []
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createRoleSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    // Only owner can add roles
    await requirePermission(supabase, projectId, user.id, "owner")

    let finalName = data.name
    let finalUserId = data.userId

    if (data.assignSelf) {
      finalUserId = user.id
      finalName = user.name || user.email || "Me"
    } else if (data.userId && !data.name) {
      const { data: targetUser } = await supabase
        .from("User")
        .select("name, email")
        .eq("id", data.userId)
        .single()

      if (targetUser) {
        finalName = targetUser.name || targetUser.email || "Unknown"
      }
    }

    if (!finalName) {
      throw new BadRequestError("Name is required")
    }

    // Check for existing role with same name
    const { data: existing } = await supabase
      .from("ProjectRole")
      .select("id")
      .eq("projectId", projectId)
      .eq("role", data.role)
      .eq("name", finalName)
      .single()

    if (existing) {
      throw new ConflictError("This role assignment already exists")
    }

    if (finalUserId) {
      const { data: existingUserRole } = await supabase
        .from("ProjectRole")
        .select("id")
        .eq("projectId", projectId)
        .eq("role", data.role)
        .eq("userId", finalUserId)
        .single()

      if (existingUserRole) {
        throw new ConflictError("This user already has this role on the project")
      }
    }

    const { data: role, error: createError } = await supabase
      .from("ProjectRole")
      .insert({
        projectId,
        role: data.role,
        name: finalName,
        userId: finalUserId,
      })
      .select(`
        *,
        user:User!userId(id, name, image)
      `)
      .single()

    if (createError) handleSupabaseError(createError, "Role")

    return role
  },
})
