import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/connections - List all accepted connections for current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all accepted connections where user is either requester or addressee
    const connections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            title: true,
            location: true,
          },
        },
        addressee: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            title: true,
            location: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Map to return the "other" user (not the current user)
    const connectedUsers = connections.map((conn) => {
      const otherUser = conn.requesterId === userId ? conn.addressee : conn.requester
      return {
        connectionId: conn.id,
        connectedAt: conn.updatedAt,
        user: otherUser,
      }
    })

    return NextResponse.json({ connections: connectedUsers })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

// Validation schema for creating a connection request
const createConnectionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  message: z.string().max(500).optional(),
})

// POST /api/connections - Send a connection request
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const result = createConnectionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { userId: targetUserId } = result.data
    const requesterId = session.user.id

    // Can't connect to yourself
    if (requesterId === targetUserId) {
      return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isPublic: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if connection already exists (in either direction)
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: requesterId },
        ],
      },
    })

    if (existingConnection) {
      if (existingConnection.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already connected' }, { status: 400 })
      }
      if (existingConnection.status === 'PENDING') {
        // If they sent us a request, accept it instead
        if (existingConnection.requesterId === targetUserId) {
          const updated = await prisma.connection.update({
            where: { id: existingConnection.id },
            data: { status: 'ACCEPTED' },
          })
          return NextResponse.json({
            connection: updated,
            message: 'Connection request accepted',
          })
        }
        return NextResponse.json({ error: 'Connection request already sent' }, { status: 400 })
      }
      if (existingConnection.status === 'DECLINED') {
        // Check if enough time has passed to re-request (7 days)
        const declinedAt = existingConnection.updatedAt
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        if (declinedAt > sevenDaysAgo) {
          return NextResponse.json(
            { error: 'Cannot send request again yet. Please wait a few days.' },
            { status: 400 }
          )
        }

        // Delete the old declined connection and create new
        await prisma.connection.delete({ where: { id: existingConnection.id } })
      }
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        requesterId,
        addresseeId: targetUserId,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ connection }, { status: 201 })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json({ error: 'Failed to send connection request' }, { status: 500 })
  }
}
