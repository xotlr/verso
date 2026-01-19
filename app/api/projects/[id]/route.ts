import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logger } from "@/lib/logger"

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  logo: z.string().url().optional().nullable(),
  status: z
    .enum([
      "DEVELOPMENT",
      "PRE_PRODUCTION",
      "PRODUCTION",
      "POST_PRODUCTION",
      "COMPLETED",
    ])
    .optional(),
  budget: z.number().min(0).optional().nullable(),
  teamId: z.string().nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ params, supabase }) => {
    const { id } = params

    // RLS ensures user has access
    const { data: project, error } = await supabase
      .from("Project")
      .select(`
        id, name, description, coverImage, banner, logo, status, budget,
        isPublic, publishedAt, userId, teamId, createdAt, updatedAt,
        team:Team(id, name),
        screenplays:Screenplay(id, title, logline, synopsis, wordCount, genre, isFavorite, type, createdAt, updatedAt),
        notes:Note(id, title, category, createdAt, updatedAt),
        schedules:Schedule(id, title, startDate, endDate, createdAt),
        budgets:Budget(id, title, total, createdAt),
        roles:ProjectRole(id, role, name, userId, user:User(id, name, image))
      `)
      .eq("id", id)
      .single()

    if (error) handleSupabaseError(error, "Project")
    if (!project) throw new NotFoundError("Project")

    // Add counts
    const result = {
      ...project,
      _count: {
        screenplays: project.screenplays?.length || 0,
        notes: project.notes?.length || 0,
        schedules: project.schedules?.length || 0,
        budgets: project.budgets?.length || 0,
      },
    }

    return result
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateProjectSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    // RLS policy requires EDITOR access for updates
    const { data: project, error } = await supabase
      .from("Project")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) handleSupabaseError(error, "Project")
    if (!project) throw new NotFoundError("Project")

    return project
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // Check if user is owner or team admin
    const { data: project } = await supabase
      .from("Project")
      .select("userId, teamId")
      .eq("id", id)
      .single()

    if (!project) {
      throw new NotFoundError("Project")
    }

    const isOwner = project.userId === user.id

    // Check team admin status if not owner
    let isTeamAdmin = false
    if (!isOwner && project.teamId) {
      const { data: membership } = await supabase
        .from("TeamMember")
        .select("role")
        .eq("teamId", project.teamId)
        .eq("userId", user.id)
        .single()

      isTeamAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN"
    }

    if (!isOwner && !isTeamAdmin) {
      throw new ForbiddenError("Only project owner or team admins can delete")
    }

    const { error } = await supabase
      .from("Project")
      .delete()
      .eq("id", id)

    if (error) handleSupabaseError(error, "Project")

    logger.audit("delete", "project", id, { userId: user.id, isOwner, isTeamAdmin })

    return { success: true }
  },
})
