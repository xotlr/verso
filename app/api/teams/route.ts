import { z } from "zod"
import { createApiHandler, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { logTeamAction } from "@/lib/audit-log"

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    // RLS filters to teams user is owner or member of
    const { data: teams, error } = await supabase
      .from("Team")
      .select(`
        *,
        owner:User!ownerId(id, name, email, image),
        members:TeamMember(
          id, role, userId, createdAt,
          user:User(id, name, email, image)
        ),
        projects:Project(id)
      `)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Team")

    // Transform to include counts
    const transformedTeams = (teams || []).map((team: any) => ({
      ...team,
      _count: {
        projects: team.projects?.length || 0,
        members: team.members?.length || 0,
        invites: 0, // Would need separate query
      },
    }))

    return transformedTeams
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createTeamSchema,
  rateLimit: RATE_LIMITS.PROJECT_CREATE,
  handler: async ({ user, data, supabase }) => {
    const { name, description, logo } = data

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("Team")
      .insert({
        name,
        description,
        logo,
        ownerId: user.id,
      })
      .select()
      .single()

    if (teamError) handleSupabaseError(teamError, "Team")

    // Add owner as member with OWNER role
    const { error: memberError } = await supabase
      .from("TeamMember")
      .insert({
        teamId: team.id,
        userId: user.id,
        role: "OWNER",
      })

    if (memberError) handleSupabaseError(memberError, "Team")

    // Fetch complete team with relations
    const { data: completeTeam, error: fetchError } = await supabase
      .from("Team")
      .select(`
        *,
        owner:User!ownerId(id, name, email, image),
        members:TeamMember(
          id, role, userId, createdAt,
          user:User(id, name, email, image)
        )
      `)
      .eq("id", team.id)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Team")

    await logTeamAction({
      teamId: team.id,
      actorId: user.id,
      action: "team_created",
      metadata: { name, description, logo },
    })

    return {
      ...completeTeam,
      _count: {
        projects: 0,
        members: 1,
        invites: 0,
      },
    }
  },
})
