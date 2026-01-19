import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"

export const GET = createApiHandler({
  auth: "optional",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user: sessionUser, params, supabase }) => {
    const { username } = params
    const normalizedUsername = username.toLowerCase()

    // Fetch user by username
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select(`
        id, name, username, emailVerified, image, banner,
        location, website, twitter, linkedin, imdb, isPublic, createdAt, plan,
        oneLiner, roles, reelUrl, availability, featuredProjectId,
        showcaseTimelapse, responseRate, projectsCompleted, influences,
        lookingFor, gear, languages, bio, title, interests, skills
      `)
      .eq("username", normalizedUsername)
      .single()

    if (userError?.code === "PGRST116" || !userData) {
      throw new NotFoundError("Profile not available")
    }
    if (userError) throw userError

    const isOwnProfile = sessionUser?.id === userData.id
    const isAccessible = isOwnProfile || userData.isPublic

    if (!isAccessible) {
      throw new NotFoundError("Profile not available")
    }

    // Fetch credits
    const { data: credits } = await supabase
      .from("Credit")
      .select("id, title, role, year, projectId, isManual, displayOrder")
      .eq("userId", userData.id)
      .order("displayOrder", { ascending: true })
      .order("year", { ascending: false })
      .limit(10)

    // Fetch featured project if set
    let featuredProject = null
    if (userData.featuredProjectId) {
      const { data: fp } = await supabase
        .from("Project")
        .select("id, name, coverImage, description")
        .eq("id", userData.featuredProjectId)
        .single()
      featuredProject = fp
    }

    // Fetch public projects
    const { data: projects } = await supabase
      .from("Project")
      .select("id, name, description, coverImage, createdAt")
      .eq("userId", userData.id)
      .eq("isPublic", true)
      .order("updatedAt", { ascending: false })
      .limit(12)

    // Get screenplay counts per project
    type ProjectItem = { id: string; name: string; description: string | null; coverImage: string | null; createdAt: string }
    const projectsWithCounts = await Promise.all(
      (projects || []).map(async (p: ProjectItem) => {
        const { count } = await supabase
          .from("Screenplay")
          .select("*", { count: "exact", head: true })
          .eq("projectId", p.id)
        return { ...p, _count: { screenplays: count || 0 } }
      })
    )

    // Fetch public screenplays with timelapse share
    const { data: screenplays } = await supabase
      .from("Screenplay")
      .select("id, title, synopsis, timelapseShareId, createdAt, updatedAt")
      .eq("userId", userData.id)
      .eq("isPublic", true)
      .not("timelapseShareId", "is", null)
      .order("updatedAt", { ascending: false })
      .limit(20)

    // Get counts
    const [projectCount, screenplayCount] = await Promise.all([
      supabase
        .from("Project")
        .select("*", { count: "exact", head: true })
        .eq("userId", userData.id),
      supabase
        .from("Screenplay")
        .select("*", { count: "exact", head: true })
        .eq("userId", userData.id),
    ])

    // Get email only for own profile
    let email = null
    if (isOwnProfile) {
      const { data: emailData } = await supabase
        .from("User")
        .select("email")
        .eq("id", userData.id)
        .single()
      email = emailData?.email
    }

    return {
      ...userData,
      email,
      credits: credits || [],
      featuredProject,
      projects: projectsWithCounts,
      screenplays: screenplays || [],
      _count: {
        projects: projectCount.count || 0,
        screenplays: screenplayCount.count || 0,
      },
    }
  },
})
