import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createId } from '@paralleldrive/cuid2';

// POST - Generate or regenerate share link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: screenplayId } = await params;

    // Verify ownership
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: session.user.id,
      },
      select: {
        id: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Screenplay not found' }, { status: 404 });
    }

    if (!screenplay.timelapseStarted) {
      return NextResponse.json(
        { error: 'No timelapse recording exists for this screenplay' },
        { status: 400 }
      );
    }

    // Generate new share ID
    const shareId = createId();

    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: { timelapseShareId: shareId },
    });

    return NextResponse.json({
      shareId,
      shareUrl: `/timelapse/${shareId}`,
    });
  } catch (error) {
    console.error('Error creating timelapse share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke share link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: screenplayId } = await params;

    // Verify ownership
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: session.user.id,
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Screenplay not found' }, { status: 404 });
    }

    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: { timelapseShareId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking timelapse share link:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
