import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import {
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
} from "@/types/shotlist"

const createShotSchema = z.object({
  sceneId: z.string().min(1, "Scene ID is required"),
  description: z.string().min(1, "Description is required"),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  cameraAngle: z.enum(CAMERA_ANGLES).nullable().optional(),
  movement: z.enum(CAMERA_MOVEMENTS).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  lens: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional().default("planned"),
  thumbnailUrl: z.string().url().nullable().optional(),
  thumbnailType: z.enum(["upload", "url"]).nullable().optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ params, supabase }) => {
    const { id: screenplayId } = params

    // RLS ensures user has access to the screenplay
    const { data: shots, error } = await supabase
      .from("Shot")
      .select("*")
      .eq("screenplayId", screenplayId)
      .order("sceneId", { ascending: true })
      .order("shotNumber", { ascending: true })

    if (error) {
      // If RLS blocks access, we get an empty result or error
      if (error.message?.includes("policy")) {
        throw new ForbiddenError("Access denied")
      }
      throw error
    }

    return { shots: shots || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createShotSchema,
  handler: async ({ params, data, supabase }) => {
    const { id: screenplayId } = params

    // Get the last shot number for this scene
    const { data: lastShot } = await supabase
      .from("Shot")
      .select("shotNumber")
      .eq("screenplayId", screenplayId)
      .eq("sceneId", data.sceneId)
      .order("shotNumber", { ascending: false })
      .limit(1)
      .single()

    const shotNumber = (lastShot?.shotNumber ?? 0) + 1

    // RLS policy requires EDITOR access to insert
    const { data: shot, error } = await supabase
      .from("Shot")
      .insert({
        screenplayId,
        sceneId: data.sceneId,
        shotNumber,
        description: data.description,
        shotType: data.shotType ?? null,
        cameraAngle: data.cameraAngle ?? null,
        movement: data.movement ?? null,
        duration: data.duration ?? null,
        lens: data.lens ?? null,
        equipment: data.equipment ?? null,
        lighting: data.lighting ?? null,
        audio: data.audio ?? null,
        notes: data.notes ?? null,
        status: data.status,
        thumbnailUrl: data.thumbnailUrl ?? null,
        thumbnailType: data.thumbnailType ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Screenplay")
      }
      if (error.message?.includes("policy")) {
        throw new ForbiddenError("You don't have edit access to this screenplay")
      }
      throw error
    }

    return shot
  },
})
