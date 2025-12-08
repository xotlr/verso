import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateUsername, normalizeUsername } from '@/lib/username'

const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  username: z.string().max(20).nullable().optional(),
  image: z.string().url().nullable().optional(),
  banner: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  twitter: z.string().max(50).nullable().optional(),
  linkedin: z.string().max(100).nullable().optional(),
  imdb: z.string().max(50).nullable().optional(),
  isPublic: z.boolean().optional(),
  // Bento blocks
  interests: z.array(z.string().max(50)).max(20).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  lookingFor: z.string().max(500).nullable().optional(),
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
        image: true,
        banner: true,
        bio: true,
        title: true,
        location: true,
        website: true,
        twitter: true,
        linkedin: true,
        imdb: true,
        isPublic: true,
        createdAt: true,
        plan: true,
        // Bento blocks
        interests: true,
        skills: true,
        lookingFor: true,
        projects: {
          where: isOwnProfile ? {} : { team: null }, // Only personal projects for public view
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
        screenplays: {
          where: isOwnProfile ? {} : { team: null },
          select: {
            id: true,
            title: true,
            synopsis: true,
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
        bio: true,
        title: true,
        location: true,
        website: true,
        twitter: true,
        linkedin: true,
        imdb: true,
        isPublic: true,
        createdAt: true,
        plan: true,
        // Bento blocks
        interests: true,
        skills: true,
        lookingFor: true,
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
