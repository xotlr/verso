import { createApiHandler, NotFoundError } from "@/lib/api"

interface ScreenplayOp {
  id: string
  operationType: string
  position: number | null
  content: string | null
  metadata: unknown
  timestamp: string
  sequenceNumber: number
}

interface ScreenplayData {
  id: string
  title: string
  timelapseStarted: string | null
  user: { name: string | null; image: string | null } | null
}

export const GET = createApiHandler({
  auth: "none",
  rateLimit: { maxRequests: 100, windowMs: 60 * 1000 },
  handler: async ({ params, searchParams, supabase }) => {
    const { shareId } = params

    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000)

    const screenplayResult = await supabase
      .from("Screenplay")
      .select(`
        id,
        title,
        timelapseStarted,
        user:User!userId(name, image)
      `)
      .eq("timelapseShareId", shareId)
      .single()
    const screenplay = screenplayResult.data as ScreenplayData | null

    if (screenplayResult.error || !screenplay) {
      throw new NotFoundError("Timelapse")
    }

    // Build query for operations
    let query = supabase
      .from("ScreenplayOperation")
      .select("id, operationType, position, content, metadata, timestamp, sequenceNumber")
      .eq("screenplayId", screenplay.id)
      .order("sequenceNumber", { ascending: true })
      .limit(limit)

    if (cursor) {
      query = query.gt("sequenceNumber", BigInt(cursor).toString())
    }

    const opsResult = await query
    const operations = opsResult.data as ScreenplayOp[] | null

    if (opsResult.error) throw opsResult.error

    // Get total count
    const { count: totalCount } = await supabase
      .from("ScreenplayOperation")
      .select("id", { count: "exact", head: true })
      .eq("screenplayId", screenplay.id)

    const serializedOperations = (operations || []).map((op) => ({
      ...op,
      sequenceNumber: op.sequenceNumber.toString(),
    }))

    const nextCursor = operations && operations.length === limit
      ? operations[operations.length - 1].sequenceNumber.toString()
      : null

    return {
      screenplay: {
        title: screenplay.title,
        author: screenplay.user?.name || "Anonymous",
        authorImage: screenplay.user?.image,
      },
      operations: serializedOperations,
      nextCursor,
      totalCount: totalCount || 0,
      timelapseStarted: screenplay.timelapseStarted,
    }
  },
})
