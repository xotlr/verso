import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { MAX_TIMELAPSE_OPERATIONS_LIMIT } from "@/lib/constants"

const MAX_BATCH_SIZE = 100

const recordOperationSchema = z.object({
  operations: z.array(z.object({
    operationType: z.enum(["insert", "delete", "replace"]),
    position: z.number().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(MAX_BATCH_SIZE),
})

export const POST = createApiHandler({
  auth: "required",
  schema: recordOperationSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("timelapseEnabled, timelapseStarted")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    if (!screenplay.timelapseEnabled) {
      throw new BadRequestError("Timelapse recording is disabled")
    }

    if (!screenplay.timelapseStarted) {
      await supabase
        .from("Screenplay")
        .update({ timelapseStarted: new Date().toISOString() })
        .eq("id", screenplayId)
    }

    const operations = data.operations.map((op) => ({
      screenplayId,
      userId: user.id,
      operationType: op.operationType,
      position: op.position ?? null,
      content: op.content ?? null,
      metadata: op.metadata ?? null,
    }))

    const { error: insertError } = await supabase
      .from("ScreenplayOperation")
      .insert(operations)

    if (insertError) handleSupabaseError(insertError, "Operation")

    return { success: true, count: operations.length }
  },
})

const getOperationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_TIMELAPSE_OPERATIONS_LIMIT).default(1000),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const GET = createApiHandler({
  auth: "optional",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id: screenplayId } = params

    // Parse and validate query params
    const queryResult = getOperationsSchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    })

    if (!queryResult.success) {
      throw new BadRequestError("Invalid query parameters")
    }

    const { cursor, limit, from: fromTimestamp, to: toTimestamp } = queryResult.data

    // Check screenplay access using RLS-enabled client
    // User can view if they own it OR if timelapse is shared
    const { data: screenplay, error: screenplayError } = await supabase
      .from("Screenplay")
      .select("id, userId, timelapseEnabled, timelapseStarted, timelapseShareId")
      .eq("id", screenplayId)
      .single()

    if (screenplayError) handleSupabaseError(screenplayError, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    // Check access: must be owner OR timelapse must be shared
    const isOwner = user?.id === screenplay.userId
    const isShared = !!screenplay.timelapseShareId

    if (!isOwner && !isShared) {
      throw new ForbiddenError("Access denied")
    }

    // Build operations query
    let query = supabase
      .from("ScreenplayOperation")
      .select(`
        id, operationType, position, content, metadata, timestamp, sequenceNumber,
        user:User!userId(id, name, image)
      `)
      .eq("screenplayId", screenplayId)
      .order("sequenceNumber", { ascending: true })
      .limit(limit)

    if (cursor) {
      query = query.gt("sequenceNumber", cursor)
    }

    if (fromTimestamp) {
      query = query.gte("timestamp", fromTimestamp)
    }

    if (toTimestamp) {
      query = query.lte("timestamp", toTimestamp)
    }

    const { data: operations, error: opError } = await query

    if (opError) handleSupabaseError(opError, "Operation")

    // Get total count
    const { count: totalCount } = await supabase
      .from("ScreenplayOperation")
      .select("*", { count: "exact", head: true })
      .eq("screenplayId", screenplayId)

    interface OpData {
      id: string
      operationType: string
      position: number | null
      content: string | null
      metadata: unknown
      timestamp: string
      sequenceNumber: number
      user: { id: string; name: string | null; image: string | null } | null
    }
    const typedOps = (operations || []) as OpData[]

    // Serialize sequenceNumber to string for safe JSON transport
    const serializedOperations = typedOps.map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber?.toString(),
    }))

    const nextCursor = typedOps.length === limit
      ? typedOps[typedOps.length - 1].sequenceNumber?.toString()
      : null

    return {
      operations: serializedOperations,
      nextCursor,
      totalCount: totalCount || 0,
      timelapseStarted: screenplay.timelapseStarted,
    }
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error) handleSupabaseError(error, "Screenplay")
    if (!screenplay) throw new NotFoundError("Screenplay")

    // Delete all operations
    await supabase
      .from("ScreenplayOperation")
      .delete()
      .eq("screenplayId", screenplayId)

    // Reset timelapse state
    const { error: updateError } = await supabase
      .from("Screenplay")
      .update({
        timelapseStarted: null,
        timelapseShareId: null,
      })
      .eq("id", screenplayId)

    if (updateError) handleSupabaseError(updateError, "Operation")

    return { success: true }
  },
})
