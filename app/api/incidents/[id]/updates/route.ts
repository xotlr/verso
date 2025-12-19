import { z } from 'zod';
import { createApiHandler } from '@/lib/api';
import { NotFoundError, UnauthorizedError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  return ADMIN_EMAILS.includes(email);
}

const createUpdateSchema = z.object({
  message: z.string().min(1),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
});

/**
 * GET /api/incidents/[id]/updates
 * Get all updates for an incident.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ params }) => {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    const updates = await prisma.incidentUpdate.findMany({
      where: { incidentId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return updates;
  },
});

/**
 * POST /api/incidents/[id]/updates
 * Add an update to an incident (admin only).
 */
export const POST = createApiHandler({
  auth: 'required',
  schema: createUpdateSchema,
  handler: async ({ user, params, data }) => {
    // Check admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    // Check incident exists
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    // Create update
    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId: params.id,
        message: data.message,
        status: data.status,
      },
    });

    // Also update the incident status
    const updateData: Record<string, unknown> = { status: data.status };
    if (data.status === 'resolved' && !incident.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    await prisma.incident.update({
      where: { id: params.id },
      data: updateData,
    });

    return update;
  },
});
