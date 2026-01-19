import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

interface CallsheetScene {
  sceneId?: string
  id?: string
}

interface CallsheetData {
  scenes?: CallsheetScene[]
}

interface SceneHeadingNode {
  type: string
  attrs?: { sceneId?: string }
  content?: Array<{ text?: string }>
}

interface ScreenplayContent {
  content?: SceneHeadingNode[]
}

interface ShotWithNotes {
  id: string
  sceneId: string
  shotNumber: number
  description: string
  shotType: string | null
  shotSize: string | null
  status: string
  takeCount: number
  circledTake: number | null
  quickNotes: string | null
  supervisorNotes: string | null
  continuityNotes: string | null
  isFlagged: boolean
  statusChangedAt: string | null
  takeNotes: {
    takeNum: number
    rating: string | null
    notes: string | null
    timecode: string | null
  }[]
}

interface SceneGroup {
  sceneId: string
  sceneName: string
  shots: ShotWithNotes[]
  totalTakes: number
  completedShots: number
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const screenplay = access.screenplay!
    const date = searchParams.get("date")
    const callsheetId = searchParams.get("callsheetId")

    let callsheet = null
    let sceneIdsFilter: string[] | null = null

    if (callsheetId) {
      const { data: callsheetData, error: callsheetError } = await supabase
        .from("Callsheet")
        .select("id, title, shootDate, callTime, wrapTime, data")
        .eq("id", callsheetId)
        .single()

      if (callsheetError && callsheetError.code !== "PGRST116") throw callsheetError
      callsheet = callsheetData

      const callsheetContent = callsheet?.data as CallsheetData | null
      if (callsheetContent?.scenes) {
        sceneIdsFilter = callsheetContent.scenes
          .map((s) => s.sceneId || s.id)
          .filter((id): id is string => id !== undefined)
      }
    }

    // Build the query
    let query = supabase
      .from("Shot")
      .select(`
        id,
        sceneId,
        shotNumber,
        description,
        shotType,
        shotSize,
        status,
        takeCount,
        circledTake,
        quickNotes,
        supervisorNotes,
        continuityNotes,
        isFlagged,
        statusChangedAt,
        takeNotes:TakeNote(takeNum, rating, notes, timecode)
      `)
      .eq("screenplayId", id)
      .in("status", ["shot", "approved"])
      .order("sceneId", { ascending: true })
      .order("shotNumber", { ascending: true })

    if (date) {
      const startDate = `${date}T00:00:00.000Z`
      const endDate = `${date}T23:59:59.999Z`
      query = query.gte("statusChangedAt", startDate).lte("statusChangedAt", endDate)
    }

    if (sceneIdsFilter && sceneIdsFilter.length > 0) {
      query = query.in("sceneId", sceneIdsFilter)
    }

    const { data: shots, error: shotsError } = await query

    if (shotsError) throw shotsError

    // Fetch screenplay content separately
    const { data: fullScreenplay } = await supabase
      .from("Screenplay")
      .select("content, title")
      .eq("id", id)
      .single()

    const screenplayContent = (fullScreenplay as { content: unknown; title: string } | null)?.content as ScreenplayContent | null
    const screenplayTitle = (fullScreenplay as { content: unknown; title: string } | null)?.title
    const sceneMap = new Map<string, string>()

    if (screenplayContent?.content) {
      for (const node of screenplayContent.content) {
        if (node.type === "scene_heading" && node.attrs?.sceneId) {
          const sceneText =
            node.content?.[0]?.text || `Scene ${node.attrs.sceneId}`
          sceneMap.set(node.attrs.sceneId, sceneText)
        }
      }
    }

    const sceneGroups = new Map<string, SceneGroup>()

    for (const shot of shots || []) {
      if (!sceneGroups.has(shot.sceneId)) {
        sceneGroups.set(shot.sceneId, {
          sceneId: shot.sceneId,
          sceneName: sceneMap.get(shot.sceneId) || `Scene ${shot.sceneId}`,
          shots: [],
          totalTakes: 0,
          completedShots: 0,
        })
      }

      const group = sceneGroups.get(shot.sceneId)!
      group.shots.push({
        id: shot.id,
        sceneId: shot.sceneId,
        shotNumber: shot.shotNumber,
        description: shot.description,
        shotType: shot.shotType,
        shotSize: shot.shotSize,
        status: shot.status,
        takeCount: shot.takeCount,
        circledTake: shot.circledTake,
        quickNotes: shot.quickNotes,
        supervisorNotes: shot.supervisorNotes,
        continuityNotes: shot.continuityNotes,
        isFlagged: shot.isFlagged,
        statusChangedAt: shot.statusChangedAt,
        takeNotes: (shot.takeNotes || []).sort((a: { takeNum: number }, b: { takeNum: number }) => a.takeNum - b.takeNum),
      })
      group.totalTakes += shot.takeCount
      group.completedShots += 1
    }

    interface ShotData { id: string; sceneId: string; shotNumber: string; status: string; takeCount: number; circledTake: number | null; isFlagged: boolean }
    const typedShots = (shots || []) as ShotData[]
    const totalShots = typedShots.length
    const totalTakes = typedShots.reduce((sum: number, s: ShotData) => sum + s.takeCount, 0)
    const approvedShots = typedShots.filter((s: ShotData) => s.status === "approved").length
    const flaggedShots = typedShots.filter((s: ShotData) => s.isFlagged).length
    const avgTakesPerShot = totalShots > 0 ? totalTakes / totalShots : 0
    const shotsWithCircled = typedShots.filter((s: ShotData) => s.circledTake !== null).length

    return {
      screenplay: {
        id: screenplay.id,
        title: screenplayTitle || "Untitled",
      },
      callsheet: callsheet
        ? {
            id: callsheet.id,
            title: callsheet.title,
            shootDate: callsheet.shootDate,
            callTime: callsheet.callTime,
            wrapTime: callsheet.wrapTime,
          }
        : null,
      date: date || null,
      generatedAt: new Date().toISOString(),
      summary: {
        totalShots,
        totalTakes,
        approvedShots,
        flaggedShots,
        shotsWithCircled,
        avgTakesPerShot: Math.round(avgTakesPerShot * 10) / 10,
        scenesWorked: sceneGroups.size,
      },
      scenes: Array.from(sceneGroups.values()),
    }
  },
})
