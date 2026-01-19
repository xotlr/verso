import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId } = params

    const { data: project, error: projectError } = await supabase
      .from("Project")
      .select(`
        id,
        name,
        description,
        coverImage,
        banner,
        logo,
        status,
        budget,
        isPublic,
        publishedAt,
        userId,
        teamId,
        createdAt,
        updatedAt,
        team:Team(
          id,
          name,
          members:TeamMember(userId)
        ),
        screenplays:Screenplay(
          id,
          title,
          logline,
          synopsis,
          wordCount,
          genre,
          isFavorite,
          type,
          createdAt,
          updatedAt
        ),
        notes:ProjectNote(
          id,
          title,
          category,
          createdAt,
          updatedAt
        ),
        schedules:Schedule(
          id,
          title,
          startDate,
          endDate,
          createdAt
        ),
        budgets:Budget(
          id,
          title,
          total,
          createdAt
        ),
        roles:ProjectRole(
          id,
          role,
          name,
          userId,
          user:User!userId(id, name, image)
        )
      `)
      .eq("id", projectId)
      .single()

    if (projectError?.code === "PGRST116" || !project) {
      throw new NotFoundError("Project")
    }
    if (projectError) handleSupabaseError(projectError, "Project")

    const isOwner = project.userId === user.id
    const isTeamMember = project.team && Array.isArray(project.team.members) &&
      project.team.members.some((m: { userId: string }) => m.userId === user.id)

    if (!isOwner && !isTeamMember) {
      throw new NotFoundError("Project")
    }

    // Fetch links and callsheets
    const [linksResult, callsheetsResult] = await Promise.all([
      supabase
        .from("ExternalLink")
        .select("*")
        .eq("projectId", projectId)
        .order("createdAt", { ascending: false }),
      supabase
        .from("Callsheet")
        .select(`
          id,
          title,
          shootDate,
          callTime,
          wrapTime,
          status,
          primaryLocation,
          weatherForecast,
          weatherTemp,
          createdAt,
          updatedAt
        `)
        .eq("projectId", projectId)
        .order("shootDate", { ascending: true }),
    ])

    if (linksResult.error) throw linksResult.error
    if (callsheetsResult.error) throw callsheetsResult.error

    // Build the clean project
    const { team, screenplays, notes, schedules, budgets, roles, ...projectData } = project
    const cleanProject = {
      ...projectData,
      team: team ? { id: team.id, name: team.name } : null,
      screenplays: screenplays || [],
      notes: notes || [],
      schedules: schedules || [],
      budgets: budgets || [],
      roles: roles || [],
      _count: {
        screenplays: (screenplays || []).length,
        notes: (notes || []).length,
        schedules: (schedules || []).length,
        budgets: (budgets || []).length,
      },
    }

    const response = NextResponse.json({
      project: cleanProject,
      links: linksResult.data || [],
      callsheets: callsheetsResult.data || [],
    })

    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  },
})
