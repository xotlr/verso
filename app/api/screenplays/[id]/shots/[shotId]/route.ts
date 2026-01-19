import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import {
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
} from "@/types/shotlist"

const updateShotSchema = z.object({
  sceneId: z.string().min(1).optional(),
  shotNumber: z.number().int().positive().optional(),
  description: z.string().min(1).optional(),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  cameraAngle: z.enum(CAMERA_ANGLES).nullable().optional(),
  movement: z.enum(CAMERA_MOVEMENTS).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  lens: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  thumbnailType: z.enum(["upload", "url"]).nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id)
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: shot, error } = await supabase
      .from("Shot")
      .select("*")
      .eq("id", shotId)
      .eq("screenplayId", screenplayId)
      .single()

    if (error) handleSupabaseError(error, "Shot")
    if (!shot) throw new NotFoundError("Shot")

    return shot
  },
})

export const PUT = createApiHandler({
  auth: "required",
  schema: updateShotSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: existingShot, error: fetchError } = await supabase
      .from("Shot")
      .select("id")
      .eq("id", shotId)
      .eq("screenplayId", screenplayId)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Shot")
    if (!existingShot) throw new NotFoundError("Shot")

    const updateData: Record<string, any> = {}
    if (data.sceneId !== undefined) updateData.sceneId = data.sceneId
    if (data.shotNumber !== undefined) updateData.shotNumber = data.shotNumber
    if (data.description !== undefined) updateData.description = data.description
    if (data.shotType !== undefined) updateData.shotType = data.shotType
    if (data.cameraAngle !== undefined) updateData.cameraAngle = data.cameraAngle
    if (data.movement !== undefined) updateData.movement = data.movement
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.lens !== undefined) updateData.lens = data.lens
    if (data.equipment !== undefined) updateData.equipment = data.equipment
    if (data.lighting !== undefined) updateData.lighting = data.lighting
    if (data.audio !== undefined) updateData.audio = data.audio
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status !== undefined) updateData.status = data.status
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
    if (data.thumbnailType !== undefined) updateData.thumbnailType = data.thumbnailType

    const { data: shot, error: updateError } = await supabase
      .from("Shot")
      .update(updateData)
      .eq("id", shotId)
      .select()
      .single()

    if (updateError) handleSupabaseError(updateError, "Shot")

    return shot
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId, shotId } = params

    const access = await checkScreenplayAccess(screenplayId, user.id, "EDITOR")
    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: existingShot, error: fetchError } = await supabase
      .from("Shot")
      .select("id")
      .eq("id", shotId)
      .eq("screenplayId", screenplayId)
      .single()

    if (fetchError) handleSupabaseError(fetchError, "Shot")
    if (!existingShot) throw new NotFoundError("Shot")

    const { error: deleteError } = await supabase
      .from("Shot")
      .delete()
      .eq("id", shotId)

    if (deleteError) handleSupabaseError(deleteError, "Shot")

    return { success: true }
  },
})
