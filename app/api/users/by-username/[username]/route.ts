import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/users/by-username/[username] - Get user by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const session = await auth()

    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        name: true,
        username: true,
        email: false, // Never expose email via username lookup
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

        // Projects (for featured selection)
        projects: {
          where: { isPublic: true },
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
        // Screenplays with timelapse
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
    const isOwnProfile = session?.user?.id === user.id
    if (!isOwnProfile && !user.isPublic) {
      return NextResponse.json({ error: 'Profile is private' }, { status: 403 })
    }

    // If it's own profile, include email
    if (isOwnProfile) {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      })
      return NextResponse.json({ ...user, email: fullUser?.email })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user by username:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
