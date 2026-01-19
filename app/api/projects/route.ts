import { z } from "zod"
import { createApiHandler, ForbiddenError, RATE_LIMITS, handleSupabaseError } from "@/lib/api"

const PLAN_LIMITS: Record<string, number> = {
  FREE: 1,
  PLUS: 5,
  PRO: 10,
  TEAM: 25,
}

const DEFAULT_PROJECT_ROLES = [
  "director",
  "writer",
  "producer",
  "cinematographer",
  "editor",
] as const

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  teamId: z.string().optional(),
  type: z
    .enum(["FEATURE_FILM", "SHORT_FILM", "TV_SERIES", "STAGE_PLAY", "OTHER"])
    .optional()
    .default("FEATURE_FILM"),
  creatorRole: z.enum(["writer", "director", "producer"]).optional().default("writer"),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, searchParams, supabase }) => {
    const teamId = searchParams.get("teamId")

    // Build query - RLS handles access control
    let query = supabase
      .from("Project")
      .select(`
        id, name, description, coverImage, banner, logo, type, status,
        budget, isFavorite, createdAt, updatedAt, teamId,
        team:Team(id, name),
        roles:ProjectRole(id, role, name, userId, user:User(id, name, image)),
        screenplays:Screenplay(id, title)
      `)

    if (teamId) {
      query = query.eq("teamId", teamId)
    }

    const { data: projects, error } = await query
      .order("isFavorite", { ascending: false })
      .order("updatedAt", { ascending: false })

    if (error) handleSupabaseError(error, "Project")

    // Transform to match expected shape with counts
    const transformedProjects = (projects || []).map((p: any) => ({
      ...p,
      screenplays: p.screenplays?.slice(0, 3) || [],
      _count: {
        screenplays: p.screenplays?.length || 0,
        notes: 0, // Would need separate query
        schedules: 0,
        budgets: 0,
      },
    }))

    return transformedProjects
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createProjectSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data, supabase }) => {
    const { name, description, teamId, type, creatorRole } = data

    // Check plan limits for personal projects
    if (!teamId) {
      const { data: userData } = await supabase
        .from("User")
        .select("plan")
        .eq("id", user.id)
        .single()

      const plan = userData?.plan || "FREE"
      const limit = PLAN_LIMITS[plan] || 1

      const { count } = await supabase
        .from("Project")
        .select("*", { count: "exact", head: true })
        .eq("userId", user.id)
        .is("teamId", null)

      if ((count || 0) >= limit) {
        throw new ForbiddenError(
          `You've reached the limit of ${limit} projects on the ${plan} plan. Upgrade to create more.`
        )
      }
    }

    // Create project - RLS will verify team access if teamId provided
    const { data: project, error: projectError } = await supabase
      .from("Project")
      .insert({
        name,
        description,
        type,
        userId: user.id,
        teamId: teamId || null,
      })
      .select()
      .single()

    if (projectError) {
      if (projectError.message?.includes("policy")) {
        throw new ForbiddenError("Access denied to team")
      }
      handleSupabaseError(projectError, "Project")
    }

    // Get creator name for role
    const { data: creator } = await supabase
      .from("User")
      .select("name")
      .eq("id", user.id)
      .single()

    // Create default project roles
    const roleInserts = DEFAULT_PROJECT_ROLES.map((role) => ({
      projectId: project.id,
      role,
      name: role === creatorRole ? (creator?.name || "Unknown") : "Unfilled",
      userId: role === creatorRole ? user.id : null,
    }))

    await supabase.from("ProjectRole").insert(roleInserts)

    // Log activity
    await supabase.from("Activity").insert({
      userId: user.id,
      type: "project_created",
      entityId: project.id,
      entityTitle: project.name,
    })

    return project
  },
})
