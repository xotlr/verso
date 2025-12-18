import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET - Get timelapse settings and stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: screenplayId } = await params;

    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
        _count: {
          select: {
            operations: true,
          },
        },
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Screenplay not found' }, { status: 404 });
    }

    // Get time range of operations
    const [firstOp, lastOp] = await Promise.all([
      prisma.screenplayOperation.findFirst({
        where: { screenplayId },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      prisma.screenplayOperation.findFirst({
        where: { screenplayId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return NextResponse.json({
      enabled: screenplay.timelapseEnabled,
      started: screenplay.timelapseStarted,
      shareId: screenplay.timelapseShareId,
      shareUrl: screenplay.timelapseShareId ? `/timelapse/${screenplay.timelapseShareId}` : null,
      operationCount: screenplay._count.operations,
      firstOperationAt: firstOp?.timestamp || null,
      lastOperationAt: lastOp?.timestamp || null,
      durationMs: firstOp && lastOp
        ? new Date(lastOp.timestamp).getTime() - new Date(firstOp.timestamp).getTime()
        : 0,
    });
  } catch (error) {
    console.error('Error fetching timelapse settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timelapse settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update timelapse settings
const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: screenplayId } = await params;
    const body = await request.json();
    const result = updateSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

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

    const updated = await prisma.screenplay.update({
      where: { id: screenplayId },
      data: {
        timelapseEnabled: result.data.enabled,
      },
      select: {
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    });

    return NextResponse.json({
      enabled: updated.timelapseEnabled,
      started: updated.timelapseStarted,
      shareId: updated.timelapseShareId,
    });
  } catch (error) {
    console.error('Error updating timelapse settings:', error);
    return NextResponse.json(
      { error: 'Failed to update timelapse settings' },
      { status: 500 }
    );
  }
}
