import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const updateVersionSchema = z.object({
  label: z.string().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const version = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!version || version.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    return version
  },
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateVersionSchema,
  handler: async ({ user, params, data }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const version = await prisma.screenplayVersion.update({
      where: { id: versionId },
      data: { label: data.label },
    })

    return version
  },
})

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const versionToRestore = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
    })

    if (!versionToRestore || versionToRestore.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
    })

    if (!screenplay) {
      throw new NotFoundError("Screenplay")
    }

    const lastVersion = await prisma.screenplayVersion.findFirst({
      where: { screenplayId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    })

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    const currentWordCount = screenplay.content.split(/\s+/).filter(Boolean).length
    const currentSceneCount = (screenplay.content.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length

    await prisma.screenplayVersion.create({
      data: {
        screenplayId: id,
        content: screenplay.content,
        versionNumber,
        label: "Backup before restore",
        reason: "restore",
        wordCount: currentWordCount,
        sceneCount: currentSceneCount,
        createdBy: user.id,
      },
    })

    const updatedScreenplay = await prisma.screenplay.update({
      where: { id },
      data: { content: versionToRestore.content },
    })

    return {
      success: true,
      screenplay: updatedScreenplay,
      restoredFromVersion: versionToRestore.versionNumber,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id, versionId } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const version = await prisma.screenplayVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.screenplayId !== id) {
      throw new NotFoundError("Version")
    }

    await prisma.screenplayVersion.delete({
      where: { id: versionId },
    })

    return { success: true }
  },
})
