import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateUsername, normalizeUsername } from '@/lib/username'

// Helper to create optional URL field that treats empty strings as null
const optionalUrl = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().url().nullable().optional()
)

// Helper to create optional string field that treats empty strings as null
const optionalNullableString = (maxLen: number) => z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().max(maxLen).nullable().optional()
)

// Helper for optional CUID that treats empty strings as null
const optionalCuid = z.preprocess(
  (val) => (val === '' ? null : val),
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

  // Core Profile (NEW)
  oneLiner: optionalNullableString(100),
  roles: z.array(z.string().max(50)).max(5).optional(),
  reelUrl: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().url().max(500).nullable().optional()
  ),
  availability: z.enum(['AVAILABLE', 'BUSY', 'NOT_LOOKING']).optional(),

  // The Work
  featuredProjectId: optionalCuid,
  showcaseTimelapse: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable().optional()
  ),

  // Trust Layer
  responseRate: z.enum(['UNKNOWN', 'WITHIN_HOURS', 'WITHIN_DAY', 'WITHIN_WEEK', 'SLOW']).optional(),

  // The Vibe
  influences: z.array(z.string().max(50)).max(3).optional(),
  lookingFor: optionalNullableString(500),
  gear: optionalNullableString(500),
  languages: z.array(z.string().max(30)).max(10).optional(),

  // LEGACY - keeping for backwards compatibility during migration
  bio: optionalNullableString(500),
  title: optionalNullableString(100),
  interests: z.array(z.string().max(50)).max(20).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
})

// GET /api/users/[id] - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    const isOwnProfile = session?.user?.id === id

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: isOwnProfile, // Only show email for own profile
        emailVerified: true, // For verified badge
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

        // Core Profile (NEW)
        oneLiner: true,
        roles: true,
        reelUrl: true,
        availability: true,

        // The Work
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
          orderBy: [{ displayOrder: 'asc' }, { year: 'desc' }],
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

        // Trust Layer
        responseRate: true,
        projectsCompleted: true,

        // The Vibe
        influences: true,
        lookingFor: true,
        gear: true,
        languages: true,

        // LEGACY - keeping for migration
        bio: true,
        title: true,
        interests: true,
        skills: true,

        // Projects (for dropdown selections, reduced)
        projects: {
          where: isOwnProfile ? {} : { team: null },
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            createdAt: true,
            _count: {
              select: { screenplays: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 12,
        },
        // Screenplays with timelapse for dropdown
        screenplays: {
          where: isOwnProfile ? { timelapseShareId: { not: null } } : { team: null, timelapseShareId: { not: null } },
          select: {
            id: true,
            title: true,
            synopsis: true,
            timelapseShareId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            projects: true,
            screenplays: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if profile is public (unless it's own profile)
    if (!isOwnProfile && !user.isPublic) {
      return NextResponse.json({ error: 'Profile is private' }, { status: 403 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Can only update own profile
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Handle username separately - needs validation
    let usernameToSet: string | null | undefined = undefined
    if ('username' in validatedData) {
      const usernameValue = validatedData.username
      if (usernameValue === null || usernameValue === '' || usernameValue === undefined) {
        usernameToSet = null
      } else {
        const validation = validateUsername(usernameValue)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
        const normalized = normalizeUsername(usernameValue)

        // Check if taken by someone else
        const existing = await prisma.user.findFirst({
          where: {
            username: normalized,
            NOT: { id },
          },
          select: { id: true },
        })
        if (existing) {
          return NextResponse.json({ error: 'Username is already taken' }, { status: 400 })
        }
        usernameToSet = normalized
      }
    }

    // Clean up empty strings to null (excluding username which we handle separately)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { username: _username, ...restData } = validatedData
    const cleanedData = Object.fromEntries(
      Object.entries(restData).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    )

    // Add username if it was processed
    if (usernameToSet !== undefined) {
      ;(cleanedData as Record<string, unknown>).username = usernameToSet
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: cleanedData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
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
        // Core Profile (NEW)
        oneLiner: true,
        roles: true,
        reelUrl: true,
        availability: true,
        // The Work
        featuredProjectId: true,
        showcaseTimelapse: true,
        // Trust Layer
        responseRate: true,
        projectsCompleted: true,
        // The Vibe
        influences: true,
        lookingFor: true,
        gear: true,
        languages: true,
        // LEGACY
        bio: true,
        title: true,
        interests: true,
        skills: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.flatten() },
        { status: 400 }
      )
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
