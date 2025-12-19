import { createApiHandler } from '@/lib/api';
import { prisma } from '@/lib/prisma';

// GET /api/activity - Get user's activity feed
export const GET = createApiHandler({
  auth: 'required',
  handler: async ({ user, searchParams }) => {
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          entityId: true,
          entityTitle: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.activity.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      activities,
      total,
      hasMore: offset + activities.length < total,
    };
  },
});
