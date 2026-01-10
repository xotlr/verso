import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { checkScreenplayAccess } from "@/lib/auth-utils"
import { Prisma } from "@prisma/client"

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
  status: string
  takeCount: number
  circledTake: number | null
  quickNotes: string | null
  supervisorNotes: string | null
  continuityNotes: string | null
  isFlagged: boolean
  statusChangedAt: Date | null
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
  handler: async ({ user, params, searchParams }) => {
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

    const whereClause: Prisma.ShotWhereInput = {
      screenplayId: id,
      status: { in: ["shot", "approved"] },
    }

    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`)
      const endDate = new Date(`${date}T23:59:59.999Z`)
      whereClause.statusChangedAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    let callsheet = null
    if (callsheetId) {
      callsheet = await prisma.callsheet.findUnique({
        where: { id: callsheetId },
        select: {
          id: true,
          title: true,
          shootDate: true,
          callTime: true,
          wrapTime: true,
          data: true,
        },
      })

      const callsheetData = callsheet?.data as CallsheetData | null
      if (callsheetData?.scenes) {
        const sceneIds = callsheetData.scenes
          .map((s) => s.sceneId || s.id)
          .filter((id): id is string => id !== undefined)
        whereClause.sceneId = { in: sceneIds }
      }
    }

    const shots = await prisma.shot.findMany({
      where: whereClause,
      include: {
        takeNotes: {
          select: {
            takeNum: true,
            rating: true,
            notes: true,
            timecode: true,
          },
          orderBy: { takeNum: "asc" },
        },
      },
      orderBy: [{ sceneId: "asc" }, { shotNumber: "asc" }],
    })

    const screenplayContent = screenplay.content as ScreenplayContent | null
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

    for (const shot of shots) {
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
        status: shot.status,
        takeCount: shot.takeCount,
        circledTake: shot.circledTake,
        quickNotes: shot.quickNotes,
        supervisorNotes: shot.supervisorNotes,
        continuityNotes: shot.continuityNotes,
        isFlagged: shot.isFlagged,
        statusChangedAt: shot.statusChangedAt,
        takeNotes: shot.takeNotes,
      })
      group.totalTakes += shot.takeCount
      group.completedShots += 1
    }

    const totalShots = shots.length
    const totalTakes = shots.reduce((sum, s) => sum + s.takeCount, 0)
    const approvedShots = shots.filter((s) => s.status === "approved").length
    const flaggedShots = shots.filter((s) => s.isFlagged).length
    const avgTakesPerShot = totalShots > 0 ? totalTakes / totalShots : 0
    const shotsWithCircled = shots.filter((s) => s.circledTake !== null).length

    return {
      screenplay: {
        id: screenplay.id,
        title: screenplay.title,
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
