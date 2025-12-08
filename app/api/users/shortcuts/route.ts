import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/shortcuts - Get current user's custom shortcuts
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { shortcuts: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ shortcuts: user.shortcuts || {} });
  } catch (error) {
    console.error('Error fetching shortcuts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shortcuts' },
      { status: 500 }
    );
  }
}

// PUT /api/users/shortcuts - Update current user's custom shortcuts
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shortcuts } = body;

    // Validate shortcuts is an object
    if (typeof shortcuts !== 'object' || shortcuts === null) {
      return NextResponse.json(
        { error: 'Invalid shortcuts format' },
        { status: 400 }
      );
    }

    // Update user's shortcuts
    await prisma.user.update({
      where: { id: session.user.id },
      data: { shortcuts },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating shortcuts:', error);
    return NextResponse.json(
      { error: 'Failed to update shortcuts' },
      { status: 500 }
    );
  }
}
