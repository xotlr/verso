import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/users/[id]/credits/import - Import credits from Verso ProjectRole entries
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

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's project roles
    const projectRoles = await prisma.projectRole.findMany({
      where: { userId: id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (projectRoles.length === 0) {
      return NextResponse.json(
        { message: 'No project roles found to import', imported: 0 },
        { status: 200 }
      );
    }

    // Get existing credits to avoid duplicates
    const existingCredits = await prisma.credit.findMany({
      where: { userId: id },
      select: { title: true, role: true, year: true },
    });

    const existingSet = new Set(
      existingCredits.map((c) => `${c.title}|${c.role}|${c.year}`)
    );

    // Get current max display order
    const maxOrder = await prisma.credit.aggregate({
      where: { userId: id },
      _max: { displayOrder: true },
    });
    let nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    // Check credit limit
    const currentCount = await prisma.credit.count({
      where: { userId: id },
    });
    const remainingSlots = 10 - currentCount;

    if (remainingSlots <= 0) {
      return NextResponse.json(
        { error: 'Maximum 10 credits allowed. Remove some to import more.' },
        { status: 400 }
      );
    }

    // Prepare credits to import
    const creditsToCreate = projectRoles
      .filter((pr) => {
        const year = pr.project.createdAt.getFullYear();
        const key = `${pr.project.name}|${pr.role}|${year}`;
        return !existingSet.has(key);
      })
      .slice(0, remainingSlots) // Respect the 10 credit limit
      .map((pr) => ({
        userId: id,
        title: pr.project.name,
        role: pr.role,
        year: pr.project.createdAt.getFullYear(),
        projectId: pr.project.id,
        isManual: false,
        displayOrder: nextOrder++,
      }));

    if (creditsToCreate.length === 0) {
      return NextResponse.json(
        { message: 'All project roles are already imported', imported: 0 },
        { status: 200 }
      );
    }

    // Create credits
    await prisma.credit.createMany({
      data: creditsToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Successfully imported ${creditsToCreate.length} credit(s)`,
      imported: creditsToCreate.length,
    });
  } catch (error) {
    console.error('Error importing credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
