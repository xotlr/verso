import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { SharePermission } from "@prisma/client"

async function checkScreenplayOwnership(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    include: {
      project: { select: { teamId: true } },
      team: { select: { id: true } },
      shareLink: true,
    },
  })

  if (!screenplay) {
    return { allowed: false, error: "Screenplay not found", status: 404, screenplay: null }
  }

  if (screenplay.userId === userId) {
    return { allowed: true, screenplay }
  }

  const teamId = screenplay.teamId || screenplay.project?.teamId
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    })

    if (membership) {
      return { allowed: true, screenplay }
    }
  }

  return { allowed: false, error: "Access denied", status: 403, screenplay: null }
}

function buildShareUrl(token: string, baseUrl: string) {
  return `${baseUrl}/shared/${token}`
}

const createShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).default("VIEW"),
  expiresAt: z.string().datetime().optional().nullable(),
})

const updateShareSchema = z.object({
  permission: z.enum(["VIEW", "COMMENT", "EDIT"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const shareLink = access.screenplay?.shareLink
    if (!shareLink) {
      return { shareLink: null }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShareSchema,
  handler: async ({ user, params, data, request }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    const shareLink = await prisma.shareLink.upsert({
      where: { screenplayId: id },
      create: {
        screenplayId: id,
        permission: data.permission as SharePermission,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      },
      update: {
        permission: data.permission as SharePermission,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateShareSchema,
  handler: async ({ user, params, data, request }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    if (!access.screenplay?.shareLink) {
      throw new NotFoundError("Share link")
    }

    const shareLink = await prisma.shareLink.update({
      where: { screenplayId: id },
      data: {
        ...(data.permission && { permission: data.permission as SharePermission }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = buildShareUrl(shareLink.token, baseUrl)

    return {
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        permission: shareLink.permission,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        url: shareUrl,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
      },
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const access = await checkScreenplayOwnership(id, user.id)
    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    if (!access.screenplay?.shareLink) {
      throw new NotFoundError("Share link")
    }

    await prisma.shareLink.delete({
      where: { screenplayId: id },
    })

    return { success: true }
  },
})
