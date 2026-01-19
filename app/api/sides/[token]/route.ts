import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { filterByCharacter, filterByScenes } from "@/lib/screenplay/sides-filter"
import { NextResponse } from "next/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const SIDES_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 }

// GET - Public with rate limiting, custom handler needed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const clientIp = getClientIp(request)
    const rateLimitResult = await rateLimit(`sides:${clientIp}:${token}`, SIDES_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const supabase = await createServerActionClient()

    const { data: side, error } = await supabase
      .from("DigitalSide")
      .select(`
        id,
        token,
        title,
        filterType,
        filterValue,
        expiresAt,
        isActive,
        callsheetId,
        userId,
        screenplay:Screenplay!screenplayId(
          id,
          title,
          content,
          author,
          type,
          format,
          user:User!userId(name)
        ),
        user:User!userId(name)
      `)
      .eq("token", token)
      .single()

    interface SidesData {
      id: string
      title: string
      userId: string
      isActive: boolean
      expiresAt: string | null
      filterType: string | null
      filterValue: string | null
      callsheetId: string | null
      views: number
      screenplay: { id: string; title: string; content: string; author: string | null; type: string | null; format: string | null; user: { name: string | null } | null } | null
      user: { name: string | null } | null
    }
    const typedSide = side as unknown as SidesData

    if (error || !typedSide) {
      return NextResponse.json({ error: "Digital sides not found" }, { status: 404 })
    }

    if (!typedSide.isActive) {
      return NextResponse.json(
        { error: "This digital sides link has been revoked" },
        { status: 410 }
      )
    }

    if (typedSide.expiresAt && new Date() > new Date(typedSide.expiresAt)) {
      return NextResponse.json(
        { error: "This digital sides link has expired" },
        { status: 410 }
      )
    }

    const screenplay = typedSide.screenplay as {
      id: string
      title: string
      content: string
      author: string | null
      type: string | null
      format: string | null
      user: { name: string | null } | null
    }

    let content: object
    try {
      content = JSON.parse(screenplay.content)
    } catch {
      return NextResponse.json(
        { error: "Invalid screenplay content" },
        { status: 500 }
      )
    }

    let filteredContent = content
    if (typedSide.filterType === "character" && typedSide.filterValue) {
      filteredContent = filterByCharacter(content, typedSide.filterValue)
    } else if (typedSide.filterType === "scenes" && typedSide.filterValue) {
      const sceneIds = typedSide.filterValue.split(",").map((s: string) => s.trim())
      filteredContent = filterByScenes(content, sceneIds)
    }

    let callsheet = null
    if (typedSide.callsheetId) {
      const { data: callsheetData } = await supabase
        .from("Callsheet")
        .select("id, title, shootDate, callTime, primaryLocation, data")
        .eq("id", typedSide.callsheetId)
        .single()
      callsheet = callsheetData
    }

    // Increment view count in background
    ;(supabase.from("SidesShare") as ReturnType<typeof supabase.from>)
      .update({ views: typedSide.views + 1 })
      .eq("id", typedSide.id)
      .then(({ error: updateError }: { error: Error | null }) => {
        if (updateError) {
          logger.error("Failed to increment view count", updateError)
        }
      })

    return NextResponse.json({
      title: typedSide.title,
      screenplay: {
        title: screenplay.title,
        author:
          screenplay.author ||
          screenplay.user?.name ||
          "Anonymous",
        content: filteredContent,
        type: screenplay.type,
        format: screenplay.format,
      },
      filterType: typedSide.filterType,
      filterValue: typedSide.filterValue,
      expiresAt: typedSide.expiresAt,
      callsheet,
      createdBy: (typedSide.user as { name: string | null } | null)?.name,
    })
  } catch (error) {
    logger.error("Failed to fetch digital sides", error instanceof Error ? error : undefined, {
      token,
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { token } = params

    const { data: side, error } = await supabase
      .from("DigitalSide")
      .select("id, userId")
      .eq("token", token)
      .single()

    if (error || !side) {
      throw new NotFoundError("Digital sides")
    }

    if (side.userId !== user.id) {
      throw new ForbiddenError()
    }

    await supabase
      .from("DigitalSide")
      .update({ isActive: false })
      .eq("token", token)

    return { success: true }
  },
})
