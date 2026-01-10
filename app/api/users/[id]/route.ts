import { z } from "zod"
import { createApiHandler, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
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

const profileSelect = {
  id: true,
  name: true,
  username: true,
  emailVerified: true,
  image: true,
  banner: true,
  location: true,
  website: true,
  twitter: true,
  linkedin: true,
  imdb: true,
  isPublic: true,
  createdAt: true,
  plan: true,
  oneLiner: true,
  roles: true,
  reelUrl: true,
  availability: true,
  featuredProjectId: true,
  featuredProject: {
    select: {
      id: true,
      name: true,
      coverImage: true,
      description: true,
    },
  },
  showcaseTimelapse: true,
  credits: {
    orderBy: [{ displayOrder: "asc" as const }, { year: "desc" as const }],
    take: 10,
    select: {
      id: true,
      title: true,
      role: true,
      year: true,
      projectId: true,
      isManual: true,
      displayOrder: true,
    },
  },
  responseRate: true,
  projectsCompleted: true,
  influences: true,
  lookingFor: true,
  gear: true,
  languages: true,
  bio: true,
  title: true,
  interests: true,
  skills: true,
}

export const GET = createApiHandler({
  auth: "optional",
  handler: async ({ user, params }) => {
    const { id } = params
    const isOwnProfile = user?.id === id

    const userData = await prisma.user.findUnique({
      where: { id },
      select: {
        ...profileSelect,
        email: isOwnProfile,
        projects: {
          where: isOwnProfile ? {} : { team: null },
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            createdAt: true,
            _count: { select: { screenplays: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
        },
        screenplays: {
          where: isOwnProfile
            ? { timelapseShareId: { not: null } }
            : { team: null, timelapseShareId: { not: null } },
          select: {
            id: true,
            title: true,
            synopsis: true,
            timelapseShareId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        _count: { select: { projects: true, screenplays: true } },
      },
    })

    if (!userData) {
      throw new NotFoundError("User")
    }

    if (!isOwnProfile && !userData.isPublic) {
      throw new ForbiddenError("Profile is private")
    }

    return userData
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateProfileSchema,
  handler: async ({ user, params, data }) => {
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

        const existing = await prisma.user.findFirst({
          where: { username: normalized, NOT: { id } },
          select: { id: true },
        })
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: cleanedData,
      select: {
        ...profileSelect,
        email: true,
      },
    })

    return updatedUser
  },
})
