import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get public timelapse data by share ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

    // Find screenplay by share ID
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        timelapseShareId: shareId,
      },
      select: {
        id: true,
        title: true,
        timelapseStarted: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    if (!screenplay) {
      return NextResponse.json({ error: 'Timelapse not found' }, { status: 404 });
    }

    // Build query for operations
    const where: {
      screenplayId: string;
      sequenceNumber?: { gt: bigint };
    } = {
      screenplayId: screenplay.id,
    };

    if (cursor) {
      where.sequenceNumber = { gt: BigInt(cursor) };
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
      },
    });

    // Get total count
    const totalCount = await prisma.screenplayOperation.count({
      where: { screenplayId: screenplay.id },
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
      screenplay: {
        title: screenplay.title,
        author: screenplay.user?.name || 'Anonymous',
        authorImage: screenplay.user?.image,
      },
      operations: serializedOperations,
      nextCursor,
      totalCount,
      timelapseStarted: screenplay.timelapseStarted,
    });
  } catch (error) {
    console.error('Error fetching public timelapse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timelapse' },
      { status: 500 }
    );
  }
}
