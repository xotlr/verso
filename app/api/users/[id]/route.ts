import { z } from "zod"
import { createApiHandler, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/api"
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
  handler: async ({ user, params, supabase }) => {
    const { id } = params
    const isOwnProfile = user?.id === id

    // Fetch user data with related data
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select(`
        id, name, username, emailVerified, image, banner,
        location, website, twitter, linkedin, imdb, isPublic, createdAt, plan,
        oneLiner, roles, reelUrl, availability, featuredProjectId,
        showcaseTimelapse, responseRate, projectsCompleted, influences,
        lookingFor, gear, languages, bio, title, interests, skills
      `)
      .eq("id", id)
      .single()

    if (userError?.code === "PGRST116" || !userData) {
      throw new NotFoundError("User")
    }
    if (userError) throw userError

    if (!isOwnProfile && !userData.isPublic) {
      throw new ForbiddenError("Profile is private")
    }

    // Fetch credits
    const { data: credits } = await supabase
      .from("Credit")
      .select("id, title, role, year, projectId, isManual, displayOrder")
      .eq("userId", id)
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

    // Fetch projects with optional team filtering
    const projectQuery = supabase
      .from("Project")
      .select("id, name, description, coverImage, createdAt")
      .eq("userId", id)
      .order("updatedAt", { ascending: false })
      .limit(12)

    if (!isOwnProfile) {
      projectQuery.is("teamId", null)
    }

    const { data: projects } = await projectQuery

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

    // Fetch screenplays with timelapse share
    let screenplayQuery = supabase
      .from("Screenplay")
      .select("id, title, synopsis, timelapseShareId, createdAt, updatedAt")
      .eq("userId", id)
      .not("timelapseShareId", "is", null)
      .order("updatedAt", { ascending: false })
      .limit(20)

    if (!isOwnProfile) {
      screenplayQuery = screenplayQuery.is("teamId", null)
    }

    const { data: screenplays } = await screenplayQuery

    // Get counts
    const [projectCount, screenplayCount] = await Promise.all([
      supabase
        .from("Project")
        .select("*", { count: "exact", head: true })
        .eq("userId", id),
      supabase
        .from("Screenplay")
        .select("*", { count: "exact", head: true })
        .eq("userId", id),
    ])

    // Get email only for own profile
    let email = null
    if (isOwnProfile) {
      const { data: emailData } = await supabase
        .from("User")
        .select("email")
        .eq("id", id)
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

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateProfileSchema,
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

    if (error) throw error

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
