import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCreditSchema = z.object({
  title: z.string().min(1).max(200),
  role: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100),
  projectId: z.string().cuid().nullable().optional(),
});

const reorderCreditsSchema = z.object({
  creditIds: z.array(z.string().cuid()),
});

// GET /api/users/[id]/credits - List user's credits
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const credits = await prisma.credit.findMany({
      where: { userId: id },
      orderBy: [{ displayOrder: 'asc' }, { year: 'desc' }],
      select: {
        id: true,
        title: true,
        role: true,
        year: true,
        projectId: true,
        isManual: true,
        displayOrder: true,
        project: {
          select: {
            id: true,
            name: true,
            coverImage: true,
          },
        },
      },
    });

    return NextResponse.json(credits);
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/credits - Add a credit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Can only add credits to own profile
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCreditSchema.parse(body);

    // Check if user already has 10 credits (max limit)
    const existingCount = await prisma.credit.count({
      where: { userId: id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 credits allowed. Remove one to add another.' },
        { status: 400 }
      );
    }

    // Get the next display order
    const maxOrder = await prisma.credit.aggregate({
      where: { userId: id },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const credit = await prisma.credit.create({
      data: {
        userId: id,
        title: validatedData.title,
        role: validatedData.role,
        year: validatedData.year,
        projectId: validatedData.projectId ?? null,
        isManual: !validatedData.projectId,
        displayOrder: nextOrder,
      },
      select: {
        id: true,
        title: true,
        role: true,
        year: true,
        projectId: true,
        isManual: true,
        displayOrder: true,
      },
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.flatten() },
        { status: 400 }
      );
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'This credit already exists' },
        { status: 400 }
      );
    }

    console.error('Error creating credit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/credits - Reorder credits
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { creditIds } = reorderCreditsSchema.parse(body);

    // Update display order for each credit
    await prisma.$transaction(
      creditIds.map((creditId, index) =>
        prisma.credit.update({
          where: { id: creditId, userId: id },
          data: { displayOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('Error reordering credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
