import { createApiHandler } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    // Fetch screenplay shares
    const { data: screenplayShares } = await supabase
      .from("ScreenplayShare")
      .select(`
        id, role, createdAt,
        sharer:User!sharerId(id, name, image),
        screenplay:Screenplay(
          id, title, logline, genre, updatedAt, type,
          user:User(id, name, image)
        )
      `)
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    // Fetch project shares
    const { data: projectShares } = await supabase
      .from("ProjectShare")
      .select(`
        id, role, createdAt,
        sharer:User!sharerId(id, name, image),
        project:Project(
          id, name, description, type, status, updatedAt,
          user:User(id, name, image)
        )
      `)
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    // Get screenplay counts for projects
    const projectsWithCounts = await Promise.all(
      (projectShares || []).map(async (share: any) => {
        if (!share.project) return share
        const { count } = await supabase
          .from("Screenplay")
          .select("*", { count: "exact", head: true })
          .eq("projectId", share.project.id)
        return {
          ...share,
          project: { ...share.project, _count: { screenplays: count || 0 } },
        }
      })
    )

    // Fetch series shares
    const { data: seriesShares } = await supabase
      .from("SeriesShare")
      .select(`
        id, role, createdAt,
        sharer:User!sharerId(id, name, image),
        series:Series(
          id, title, logline, genre, format, updatedAt,
          user:User(id, name, image)
        )
      `)
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })

    // Get counts for series
    const seriesWithCounts = await Promise.all(
      (seriesShares || []).map(async (share: any) => {
        if (!share.series) return share
        const [seasonsResult, episodesResult] = await Promise.all([
          supabase
            .from("Season")
            .select("*", { count: "exact", head: true })
            .eq("seriesId", share.series.id),
          supabase
            .from("Episode")
            .select("*", { count: "exact", head: true })
            .eq("seriesId", share.series.id),
        ])
        return {
          ...share,
          series: {
            ...share.series,
            _count: {
              seasons: seasonsResult.count || 0,
              episodes: episodesResult.count || 0,
            },
          },
        }
      })
    )

    return {
      screenplays: (screenplayShares || []).map((s: any) => ({
        ...s.screenplay,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "screenplay" as const,
      })),
      projects: projectsWithCounts.map((p: any) => ({
        ...p.project,
        shareId: p.id,
        shareRole: p.role,
        sharedAt: p.createdAt,
        sharedBy: p.sharer,
        type: "project" as const,
      })),
      series: seriesWithCounts.map((s: any) => ({
        ...s.series,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "series" as const,
      })),
    }
  },
})
