import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updating a connection
const updateConnectionSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
})

// PATCH /api/connections/[id] - Accept or decline a connection request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: connectionId } = await params
    const body = await request.json()
    const result = updateConnectionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { status } = result.data
    const userId = session.user.id

    // Find the connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Only the addressee (receiver) can accept/decline
    if (connection.addresseeId !== userId) {
      return NextResponse.json(
        { error: 'Only the recipient can respond to this request' },
        { status: 403 }
      )
    }

    // Can only update pending requests
    if (connection.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    // Update the connection
    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status },
    })

    return NextResponse.json({
      connection: updated,
      message: status === 'ACCEPTED' ? 'Connection accepted' : 'Connection declined',
    })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}

// DELETE /api/connections/[id] - Remove a connection or cancel a pending request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: connectionId } = await params
    const userId = session.user.id

    // Find the connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Can only delete if you're part of the connection
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the connection
    await prisma.connection.delete({
      where: { id: connectionId },
    })

    return NextResponse.json({
      message:
        connection.status === 'PENDING'
          ? 'Request cancelled'
          : 'Connection removed',
    })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}
