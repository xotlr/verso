import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateUsername, normalizeUsername, generateUsernameSuggestions } from '@/lib/username'

// POST /api/users/username/check - Check username availability
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Validate username format
    const validation = validateUsername(username)
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error,
      })
    }

    const normalized = normalizeUsername(username)

    // Check if already taken (excluding current user)
    const existing = await prisma.user.findFirst({
      where: {
        username: normalized,
        NOT: { id: session.user.id },
      },
      select: { id: true },
    })

    if (existing) {
      // Generate suggestions based on user's name
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      })

      const suggestions = user?.name ? generateUsernameSuggestions(user.name) : []

      // Filter out taken suggestions
      const availableSuggestions: string[] = []
      for (const suggestion of suggestions) {
        const taken = await prisma.user.findUnique({
          where: { username: suggestion },
          select: { id: true },
        })
        if (!taken) {
          availableSuggestions.push(suggestion)
        }
        if (availableSuggestions.length >= 3) break
      }

      return NextResponse.json({
        available: false,
        error: 'This username is already taken',
        suggestions: availableSuggestions,
      })
    }

    return NextResponse.json({
      available: true,
      normalized,
    })
  } catch (error) {
    console.error('Error checking username:', error)
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
  }
}
