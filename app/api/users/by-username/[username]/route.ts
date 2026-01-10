import { createApiHandler, NotFoundError, RATE_LIMITS } from "@/lib/api"
import { prisma } from "@/lib/prisma"

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
  projects: {
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      coverImage: true,
      createdAt: true,
      _count: { select: { screenplays: true } },
    },
    orderBy: { updatedAt: "desc" as const },
    take: 12,
  },
  screenplays: {
    where: { isPublic: true, timelapseShareId: { not: null } },
    select: {
      id: true,
      title: true,
      synopsis: true,
      timelapseShareId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" as const },
    take: 20,
  },
  _count: { select: { projects: true, screenplays: true } },
}

export const GET = createApiHandler({
  auth: "optional",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user: sessionUser, params }) => {
    const { username } = params
    const normalizedUsername = username.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: profileSelect,
    })

    const isOwnProfile = user && sessionUser?.id === user.id
    const isAccessible = user && (isOwnProfile || user.isPublic)

    if (!isAccessible) {
      throw new NotFoundError("Profile not available")
    }

    if (isOwnProfile) {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      })
      return { ...user, email: fullUser?.email }
    }

    return user
  },
})
