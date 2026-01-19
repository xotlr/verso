import { z } from "zod"
import { createApiHandler, NotFoundError, BadRequestError } from "@/lib/api"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getSession } from "@/lib/supabase-auth"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const recordOperationSchema = z.object({
  operations: z.array(z.object({
    operationType: z.enum(["insert", "delete", "replace"]),
    position: z.number().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
})

export const POST = createApiHandler({
  auth: "required",
  schema: recordOperationSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("timelapseEnabled, timelapseStarted")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

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

    if (insertError) throw insertError

    return { success: true, count: operations.length }
  },
})

// GET - mixed auth (owner OR public timelapse) - custom handler needed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: screenplayId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const session = await getSession()
    const userId = session?.user?.id

    const supabase = await createServiceRoleClient()

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000)
    const fromTimestamp = searchParams.get("from")
    const toTimestamp = searchParams.get("to")

    // Check screenplay access (owner or has shareId)
    interface ScreenplayData { id: string; userId: string; timelapseEnabled: boolean; timelapseStarted: string | null; timelapseShareId: string | null }
    const screenplayResult = await supabase
      .from("Screenplay")
      .select("id, userId, timelapseEnabled, timelapseStarted, timelapseShareId")
      .eq("id", screenplayId)
      .single()

    const screenplay = screenplayResult.data as ScreenplayData | null
    if (screenplayResult.error?.code === "PGRST116" || !screenplay) {
      return NextResponse.json({ error: "Screenplay not found" }, { status: 404 })
    }

    if (screenplay.userId !== userId && !screenplay.timelapseShareId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    if (opError) throw opError

    const { count: totalCount } = await supabase
      .from("ScreenplayOperation")
      .select("*", { count: "exact", head: true })
      .eq("screenplayId", screenplayId)

    interface OpData { id: string; operationType: string; position: number | null; content: string | null; metadata: unknown; timestamp: string; sequenceNumber: number; user: { id: string; name: string | null; image: string | null } | null }
    const typedOps = (operations || []) as OpData[]
    const serializedOperations = typedOps.map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber?.toString(),
    }))

    const nextCursor = typedOps.length === limit
      ? typedOps[typedOps.length - 1].sequenceNumber?.toString()
      : null

    return NextResponse.json({
      operations: serializedOperations,
      nextCursor,
      totalCount: totalCount || 0,
      timelapseStarted: screenplay.timelapseStarted,
    })
  } catch (error) {
    logger.error("Failed to fetch timelapse operations", error instanceof Error ? error : undefined, {
      screenplayId,
    })
    return NextResponse.json(
      { error: "Failed to fetch operations" },
      { status: 500 }
    )
  }
}

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: screenplayId } = params

    const { data: screenplay, error } = await supabase
      .from("Screenplay")
      .select("id")
      .eq("id", screenplayId)
      .eq("userId", user.id)
      .single()

    if (error?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (error) throw error

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

    if (updateError) throw updateError

    return { success: true }
  },
})
