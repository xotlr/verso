import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { UnauthorizedError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';

// Admin emails - in production, this would be in a database or environment variable
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  // Allow all users in development, or check admin list in production
  if (process.env.NODE_ENV !== 'production') return true;
  return ADMIN_EMAILS.includes(email);
}

const createIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.enum(['critical', 'major', 'minor']),
  affectedServices: z.array(z.string()),
  startedAt: z.string().optional(), // ISO date string
});

/**
 * GET /api/incidents
 * Returns all incidents (public, for status page).
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ searchParams }) => {
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // 'active' | 'resolved' | null (all)

    const where: { status?: { not?: string } | string } = {};
    if (status === 'active') {
      where.status = { not: 'resolved' };
    } else if (status === 'resolved') {
      where.status = 'resolved';
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return incidents;
  },
});

/**
 * POST /api/incidents
 * Create a new incident (admin only).
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: createIncidentSchema,
  handler: async ({ user, data }) => {
    // Check admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    const incident = await prisma.incident.create({
      data: {
        title: data.title,
        description: data.description,
        severity: data.severity,
        affectedServices: data.affectedServices,
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        status: 'investigating',
      },
      include: {
        updates: true,
      },
    });

    return incident;
  },
});
