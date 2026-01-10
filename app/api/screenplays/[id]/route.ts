import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError, ConflictError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params

    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, teamId: true } },
        team: { select: { id: true, name: true } },
        series: { select: { id: true, title: true } },
        seasonRef: { select: { id: true, number: true, title: true } },
        shares: {
          where: { userId: user.id },
          select: { role: true },
          take: 1,
        },
      },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    let hasAccess = false

    if (screenplay.userId === user.id) {
      hasAccess = true
    } else if (screenplay.shares.length > 0) {
      hasAccess = true
    } else {
      const teamId = screenplay.teamId || screenplay.project?.teamId
      if (teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId: user.id } },
          select: { role: true },
        })
        if (membership) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      throw new ForbiddenError("Access denied")
    }

    await prisma.screenplay.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
      select: { id: true },
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { shares: _shares, ...screenplayResponse } = screenplay
    if (screenplayResponse.project) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teamId: _teamId, ...projectData } = screenplayResponse.project
      screenplayResponse.project = projectData as typeof screenplayResponse.project
    }

    return screenplayResponse
  },
})

const updateScreenplaySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  synopsis: z.string().optional().nullable(),
  logline: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  type: z.enum(["FILM", "TV"]).optional(),
  season: z.number().int().positive().nullable().optional(),
  episode: z.number().int().positive().nullable().optional(),
  episodeTitle: z.string().max(255).nullable().optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactAddress: z.string().max(500).nullable().optional(),
  copyrightYear: z.number().int().min(1900).max(2100).nullable().optional(),
  copyrightHolder: z.string().max(255).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  draftLabel: z.string().max(100).nullable().optional(),
  draftDate: z.string().nullable().optional(),
  showTitlePageContact: z.boolean().optional(),
  showTitlePageCopyright: z.boolean().optional(),
  showTitlePageDraft: z.boolean().optional(),
  expectedUpdatedAt: z.number().optional(),
})

async function handleUpdate(user: { id: string }, params: Record<string, string>, data: z.infer<typeof updateScreenplaySchema>) {
  const { id } = params
  const access = await checkScreenplayAccess(id, user.id, 'EDITOR')

  if (!access.allowed) {
    if (access.status === 404) throw new NotFoundError("Screenplay")
    throw new ForbiddenError(access.error)
  }

  if (data.content !== undefined) {
    const contentSize = new TextEncoder().encode(data.content).length
    const MAX_CONTENT_SIZE = 5 * 1024 * 1024
    if (contentSize > MAX_CONTENT_SIZE) {
      throw new BadRequestError("Content too large. Maximum size is 5MB.")
    }
  }

  if (data.expectedUpdatedAt !== undefined) {
    const current = await prisma.screenplay.findUnique({
      where: { id },
      select: { updatedAt: true },
    })

    if (current && current.updatedAt.getTime() !== data.expectedUpdatedAt) {
      throw new ConflictError("Screenplay was modified by another user")
    }
  }

  const wordCount = data.content !== undefined
    ? data.content.split(/\s+/).filter(Boolean).length
    : undefined

  const screenplay = await prisma.screenplay.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(wordCount !== undefined && { wordCount }),
      ...(data.synopsis !== undefined && { synopsis: data.synopsis }),
      ...(data.logline !== undefined && { logline: data.logline }),
      ...(data.genre !== undefined && { genre: data.genre }),
      ...(data.author !== undefined && { author: data.author }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.season !== undefined && { season: data.season }),
      ...(data.episode !== undefined && { episode: data.episode }),
      ...(data.episodeTitle !== undefined && { episodeTitle: data.episodeTitle }),
      ...(data.contactName !== undefined && { contactName: data.contactName }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.contactAddress !== undefined && { contactAddress: data.contactAddress }),
      ...(data.copyrightYear !== undefined && { copyrightYear: data.copyrightYear }),
      ...(data.copyrightHolder !== undefined && { copyrightHolder: data.copyrightHolder }),
      ...(data.registrationNumber !== undefined && { registrationNumber: data.registrationNumber }),
      ...(data.draftLabel !== undefined && { draftLabel: data.draftLabel }),
      ...(data.draftDate !== undefined && { draftDate: data.draftDate ? new Date(data.draftDate) : null }),
      ...(data.showTitlePageContact !== undefined && { showTitlePageContact: data.showTitlePageContact }),
      ...(data.showTitlePageCopyright !== undefined && { showTitlePageCopyright: data.showTitlePageCopyright }),
      ...(data.showTitlePageDraft !== undefined && { showTitlePageDraft: data.showTitlePageDraft }),
    },
  })

  return screenplay
}

export const PUT = createApiHandler({
  auth: "required",
  schema: updateScreenplaySchema,
  handler: async ({ user, params, data }) => handleUpdate(user, params, data),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateScreenplaySchema,
  handler: async ({ user, params, data }) => handleUpdate(user, params, data),
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id } = params
    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) throw new NotFoundError("Screenplay")
      throw new ForbiddenError(access.error)
    }

    if (!access.isOwner) {
      throw new ForbiddenError("Only the owner can delete this screenplay")
    }

    await prisma.screenplay.delete({
      where: { id },
    })

    return { success: true }
  },
})
