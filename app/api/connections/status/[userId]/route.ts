import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type ConnectionStatusResponse = {
  status: 'none' | 'pending_sent' | 'pending_received' | 'connected'
  connectionId: string | null
}

// GET /api/connections/status/[userId] - Check connection status with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId: targetUserId } = await params
    const currentUserId = session.user.id

    // Can't check connection with yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json<ConnectionStatusResponse>({
        status: 'none',
        connectionId: null,
      })
    }

    // Find any connection between the two users
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: currentUserId },
        ],
      },
    })

    if (!connection) {
      return NextResponse.json<ConnectionStatusResponse>({
        status: 'none',
        connectionId: null,
      })
    }

    let status: ConnectionStatusResponse['status']

    if (connection.status === 'ACCEPTED') {
      status = 'connected'
    } else if (connection.status === 'PENDING') {
      // Who sent the request?
      if (connection.requesterId === currentUserId) {
        status = 'pending_sent'
      } else {
        status = 'pending_received'
      }
    } else {
      // DECLINED - treat as no connection
      status = 'none'
    }

    return NextResponse.json<ConnectionStatusResponse>({
      status,
      connectionId: connection.id,
    })
  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 })
  }
}
