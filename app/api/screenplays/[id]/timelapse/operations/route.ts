import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Schema for batch recording operations
const recordOperationSchema = z.object({
  operations: z.array(z.object({
    operationType: z.enum(['insert', 'delete', 'replace']),
    position: z.number().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
});

// POST - Record timelapse operations (batch)
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
    const body = await request.json();
    const result = recordOperationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verify ownership and check if timelapse is enabled
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        userId: session.user.id,
      },
      select: {
        timelapseEnabled: true,
        timelapseStarted: true,
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Screenplay not found' }, { status: 404 });
    }

    if (!screenplay.timelapseEnabled) {
      return NextResponse.json({ error: 'Timelapse recording is disabled' }, { status: 400 });
    }

    // If timelapse hasn't started yet, start it
    if (!screenplay.timelapseStarted) {
      await prisma.screenplay.update({
        where: { id: screenplayId },
        data: { timelapseStarted: new Date() },
      });
    }

    // Record operations in batch
    const operations = result.data.operations.map((op) => ({
      screenplayId,
      userId: session.user.id,
      operationType: op.operationType,
      position: op.position ?? null,
      content: op.content ?? null,
      metadata: op.metadata ? (op.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    }));

    await prisma.screenplayOperation.createMany({
      data: operations,
    });

    return NextResponse.json({ success: true, count: operations.length });
  } catch (error) {
    console.error('Error recording timelapse operations:', error);
    return NextResponse.json(
      { error: 'Failed to record operations' },
      { status: 500 }
    );
  }
}

// GET - Fetch operations for playback
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: screenplayId } = await params;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);
    const fromTimestamp = searchParams.get('from');
    const toTimestamp = searchParams.get('to');

    // Check if user owns the screenplay or if it's a shared timelapse
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id: screenplayId,
        OR: [
          { userId: session?.user?.id || '' },
          { timelapseShareId: { not: null } }, // Public timelapse
        ],
      },
      select: {
        id: true,
        userId: true,
        timelapseEnabled: true,
        timelapseStarted: true,
        timelapseShareId: true,
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Screenplay not found' }, { status: 404 });
    }

    // If not owner and no share ID, unauthorized
    if (screenplay.userId !== session?.user?.id && !screenplay.timelapseShareId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    const where: {
      screenplayId: string;
      sequenceNumber?: { gt: bigint };
      timestamp?: { gte?: Date; lte?: Date };
    } = {
      screenplayId,
    };

    if (cursor) {
      where.sequenceNumber = { gt: BigInt(cursor) };
    }

    if (fromTimestamp || toTimestamp) {
      where.timestamp = {};
      if (fromTimestamp) where.timestamp.gte = new Date(fromTimestamp);
      if (toTimestamp) where.timestamp.lte = new Date(toTimestamp);
    }

    const operations = await prisma.screenplayOperation.findMany({
      where,
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
      select: {
        id: true,
        operationType: true,
        position: true,
        content: true,
        metadata: true,
        timestamp: true,
        sequenceNumber: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Get total count for progress
    const totalCount = await prisma.screenplayOperation.count({
      where: { screenplayId },
    });

    // Convert BigInt to string for JSON serialization
    const serializedOperations = operations.map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber.toString(),
    }));

    const nextCursor = operations.length === limit
      ? operations[operations.length - 1].sequenceNumber.toString()
      : null;

    return NextResponse.json({
      operations: serializedOperations,
      nextCursor,
      totalCount,
      timelapseStarted: screenplay.timelapseStarted,
    });
  } catch (error) {
    console.error('Error fetching timelapse operations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations' },
      { status: 500 }
    );
  }
}

// DELETE - Clear timelapse data
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

    // Delete all operations
    await prisma.screenplayOperation.deleteMany({
      where: { screenplayId },
    });

    // Reset timelapse started
    await prisma.screenplay.update({
      where: { id: screenplayId },
      data: {
        timelapseStarted: null,
        timelapseShareId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing timelapse:', error);
    return NextResponse.json(
      { error: 'Failed to clear timelapse' },
      { status: 500 }
    );
  }
}
