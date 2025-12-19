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

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
  severity: z.enum(['critical', 'major', 'minor']).optional(),
  affectedServices: z.array(z.string()).optional(),
  resolvedAt: z.string().nullable().optional(),
});

/**
 * GET /api/incidents/[id]
 * Get a single incident with updates.
 */
export const GET = createApiHandler({
  auth: 'none',
  handler: async ({ params }) => {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    return incident;
  },
});

/**
 * PUT /api/incidents/[id]
 * Update an incident (admin only).
 */
export const PUT = createApiHandler({
  auth: 'required',
  schema: updateIncidentSchema,
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
    const existing = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      throw new NotFoundError('Incident');
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.severity) updateData.severity = data.severity;
    if (data.affectedServices) updateData.affectedServices = data.affectedServices;
    if (data.status) {
      updateData.status = data.status;
      // Auto-set resolvedAt when marking as resolved
      if (data.status === 'resolved' && !existing.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }
    if (data.resolvedAt !== undefined) {
      updateData.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;
    }

    const incident = await prisma.incident.update({
      where: { id: params.id },
      data: updateData,
      include: {
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return incident;
  },
});

/**
 * DELETE /api/incidents/[id]
 * Delete an incident (admin only).
 */
export const DELETE = createApiHandler({
  auth: 'required',
  handler: async ({ user, params }) => {
    // Check admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (!isAdmin(dbUser?.email)) {
      throw new UnauthorizedError('Admin access required');
    }

    // Check incident exists
    const existing = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      throw new NotFoundError('Incident');
    }

    await prisma.incident.delete({
      where: { id: params.id },
    });

    return { success: true };
  },
});
