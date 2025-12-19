import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCreditSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
});

// PATCH /api/users/[id]/credits/[creditId] - Update a credit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; creditId: string }> }
) {
  try {
    const { id, creditId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify credit belongs to user
    const existing = await prisma.credit.findFirst({
      where: { id: creditId, userId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateCreditSchema.parse(body);

    const credit = await prisma.credit.update({
      where: { id: creditId },
      data: validatedData,
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

    return NextResponse.json(credit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('Error updating credit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/credits/[creditId] - Delete a credit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; creditId: string }> }
) {
  try {
    const { id, creditId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify credit belongs to user
    const existing = await prisma.credit.findFirst({
      where: { id: creditId, userId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
    }

    await prisma.credit.delete({
      where: { id: creditId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
