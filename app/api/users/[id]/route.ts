import { z } from "zod"
import { createApiHandler, UnauthorizedError, ForbiddenError, NotFoundError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { validateUsername, normalizeUsername } from "@/lib/username"

const optionalUrl = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string().url().nullable().optional()
)

const optionalNullableString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(maxLen).nullable().optional()
  )

const optionalCuid = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string().cuid().nullable().optional()
)

const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  username: z.string().max(20).nullable().optional(),
  image: optionalUrl,
  banner: optionalUrl,
  location: optionalNullableString(100),
  website: optionalNullableString(200),
  twitter: optionalNullableString(50),
  linkedin: optionalNullableString(100),
  imdb: optionalNullableString(50),
  isPublic: z.boolean().optional(),
  oneLiner: optionalNullableString(100),
  roles: z.array(z.string().max(50)).max(5).optional(),
  reelUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().max(500).nullable().optional()
  ),
  availability: z.enum(["AVAILABLE", "BUSY", "NOT_LOOKING"]).optional(),
  featuredProjectId: optionalCuid,
  showcaseTimelapse: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  responseRate: z
    .enum(["UNKNOWN", "WITHIN_HOURS", "WITHIN_DAY", "WITHIN_WEEK", "SLOW"])
    .optional(),
  influences: z.array(z.string().max(50)).max(3).optional(),
  lookingFor: optionalNullableString(500),
  gear: optionalNullableString(500),
  languages: z.array(z.string().max(30)).max(10).optional(),
  bio: optionalNullableString(500),
  title: optionalNullableString(100),
  interests: z.array(z.string().max(50)).max(20).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
})

export const GET = createApiHandler({
  auth: "optional",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id } = params
    const isOwnProfile = user?.id === id

    // Fetch user data with email only if own profile
    const userSelect = isOwnProfile
      ? `id, name, username, email, emailVerified, image, banner,
         location, website, twitter, linkedin, imdb, isPublic, createdAt, plan,
         oneLiner, roles, reelUrl, availability, featuredProjectId,
         showcaseTimelapse, responseRate, projectsCompleted, influences,
         lookingFor, gear, languages, bio, title, interests, skills`
      : `id, name, username, emailVerified, image, banner,
         location, website, twitter, linkedin, imdb, isPublic, createdAt, plan,
         oneLiner, roles, reelUrl, availability, featuredProjectId,
         showcaseTimelapse, responseRate, projectsCompleted, influences,
         lookingFor, gear, languages, bio, title, interests, skills`

    const { data: userData, error: userError } = await supabase
      .from("User")
      .select(userSelect)
      .eq("id", id)
      .single()

    if (userError?.code === "PGRST116" || !userData) {
      throw new NotFoundError("User")
    }
    if (userError) handleSupabaseError(userError, "User")

    // Check privacy BEFORE fetching any other data
    if (!isOwnProfile && !userData.isPublic) {
      throw new ForbiddenError("Profile is private")
    }

    // Batch fetch related data in parallel to avoid N+1 queries
    const projectFilter = isOwnProfile ? {} : { teamId: null }

    // Fetch projects with screenplay counts in a single join query
    let projectQuery = supabase
      .from("Project")
      .select(`
        id, name, description, coverImage, createdAt,
        screenplays:Screenplay(id)
      `)
      .eq("userId", id)
      .order("updatedAt", { ascending: false })
      .limit(12)

    if (!isOwnProfile) {
      projectQuery = projectQuery.is("teamId", null)
    }

    // Run parallel queries for better performance
    const [
      creditsResult,
      featuredProjectResult,
      projectsResult,
      screenplaysResult,
      projectCountResult,
      screenplayCountResult,
    ] = await Promise.all([
      // Credits
      supabase
        .from("Credit")
        .select("id, title, role, year, projectId, isManual, displayOrder")
        .eq("userId", id)
        .order("displayOrder", { ascending: true })
        .order("year", { ascending: false })
        .limit(10),

      // Featured project (only if set)
      userData.featuredProjectId
        ? supabase
            .from("Project")
            .select("id, name, coverImage, description")
            .eq("id", userData.featuredProjectId)
            .single()
        : Promise.resolve({ data: null }),

      // Projects with screenplay counts (using join instead of N+1)
      projectQuery,

      // Screenplays with timelapse
      (async () => {
        let query = supabase
          .from("Screenplay")
          .select("id, title, synopsis, timelapseShareId, createdAt, updatedAt")
          .eq("userId", id)
          .not("timelapseShareId", "is", null)
          .order("updatedAt", { ascending: false })
          .limit(20)
        if (!isOwnProfile) {
          query = query.is("teamId", null)
        }
        return query
      })(),

      // Total project count
      supabase
        .from("Project")
        .select("*", { count: "exact", head: true })
        .eq("userId", id),

      // Total screenplay count
      supabase
        .from("Screenplay")
        .select("*", { count: "exact", head: true })
        .eq("userId", id),
    ])

    // Transform projects to include _count (avoiding N+1)
    type ProjectWithScreenplays = {
      id: string
      name: string
      description: string | null
      coverImage: string | null
      createdAt: string
      screenplays: Array<{ id: string }> | null
    }
    const projectsWithCounts = (projectsResult.data as ProjectWithScreenplays[] || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      coverImage: p.coverImage,
      createdAt: p.createdAt,
      _count: { screenplays: (p.screenplays || []).length },
    }))

    return {
      ...userData,
      credits: creditsResult.data || [],
      featuredProject: featuredProjectResult.data,
      projects: projectsWithCounts,
      screenplays: screenplaysResult.data || [],
      _count: {
        projects: projectCountResult.count || 0,
        screenplays: screenplayCountResult.count || 0,
      },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateProfileSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    let usernameToSet: string | null | undefined = undefined
    if ("username" in data) {
      const usernameValue = data.username
      if (
        usernameValue === null ||
        usernameValue === "" ||
        usernameValue === undefined
      ) {
        usernameToSet = null
      } else {
        const validation = validateUsername(usernameValue)
        if (!validation.valid) {
          throw new UnauthorizedError(validation.error)
        }
        const normalized = normalizeUsername(usernameValue)

        const { data: existing } = await supabase
          .from("User")
          .select("id")
          .eq("username", normalized)
          .neq("id", id)
          .single()

        if (existing) {
          throw new ForbiddenError("Username is already taken")
        }
        usernameToSet = normalized
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { username: _username, ...restData } = data
    const cleanedData = Object.fromEntries(
      Object.entries(restData).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    )

    if (usernameToSet !== undefined) {
      ;(cleanedData as Record<string, unknown>).username = usernameToSet
    }

    const { data: updatedUser, error } = await supabase
      .from("User")
      .update(cleanedData)
      .eq("id", id)
      .select(`
        id, name, username, emailVerified, email, image, banner,
        location, website, twitter, linkedin, imdb, isPublic, createdAt, plan,
        oneLiner, roles, reelUrl, availability, featuredProjectId,
        showcaseTimelapse, responseRate, projectsCompleted, influences,
        lookingFor, gear, languages, bio, title, interests, skills
      `)
      .single()

    if (error) handleSupabaseError(error, "User")

    // Fetch credits for response
    const { data: credits } = await supabase
      .from("Credit")
      .select("id, title, role, year, projectId, isManual, displayOrder")
      .eq("userId", id)
      .order("displayOrder", { ascending: true })
      .order("year", { ascending: false })
      .limit(10)

    return {
      ...updatedUser,
      credits: credits || [],
    }
  },
})
