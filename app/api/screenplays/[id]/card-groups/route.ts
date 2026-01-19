import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { z } from "zod"

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("blue"),
  order: z.number().int().min(0).default(0),
})

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
})

/**
 * GET /api/screenplays/[id]/card-groups
 * Get all custom card groups for a screenplay
 */
export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: groups, error } = await supabase
      .from("CustomCardGroup")
      .select("*")
      .eq("screenplayId", id)
      .order("order", { ascending: true })

    if (error) throw error

    return groups || []
  },
})

/**
 * POST /api/screenplays/[id]/card-groups
 * Create a new custom card group
 */
export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const body = await request.json()
    const data = CreateGroupSchema.parse(body)

    const { data: group, error } = await supabase
      .from("CustomCardGroup")
      .insert({
        screenplayId: id,
        name: data.name,
        color: data.color,
        order: data.order,
      })
      .select()
      .single()

    if (error) throw error

    return group
  },
})

/**
 * PUT /api/screenplays/[id]/card-groups
 * Bulk update custom card groups (reorder, update multiple)
 */
export const PUT = createApiHandler({
  auth: "required",
  handler: async ({ user, params, request, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const body = await request.json()

    if (!Array.isArray(body)) {
      throw new BadRequestError("Expected array of groups")
    }

    // Verify all groups belong to this screenplay
    const groupIds = body.map((g) => g.id).filter(Boolean)
    if (groupIds.length > 0) {
      const { data: existingGroups, error: fetchError } = await supabase
        .from("CustomCardGroup")
        .select("id")
        .eq("screenplayId", id)
        .in("id", groupIds)

      if (fetchError) throw fetchError

      if ((existingGroups?.length || 0) !== groupIds.length) {
        throw new ForbiddenError("Some groups don't belong to this screenplay")
      }
    }

    // Update all groups
    const updates = await Promise.all(
      body.map(async (group) => {
        const data = UpdateGroupSchema.parse({
          name: group.name,
          color: group.color,
          order: group.order,
        })

        const { data: updated, error } = await supabase
          .from("CustomCardGroup")
          .update(data)
          .eq("id", group.id)
          .select()
          .single()

        if (error) throw error
        return updated
      })
    )

    return updates
  },
})
