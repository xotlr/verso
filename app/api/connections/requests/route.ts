import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/connections/requests - Get pending connection requests received by current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Get pending requests where current user is the addressee (they received the request)
    const requests = await prisma.connection.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
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
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      requests: requests.map((req) => ({
        id: req.id,
        createdAt: req.createdAt,
        user: req.requester,
      })),
    })
  } catch (error) {
    console.error('Error fetching connection requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
