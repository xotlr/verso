import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkScreenplayAccess } from "@/lib/auth-utils";

interface ShotWithNotes {
  id: string;
  sceneId: string;
  shotNumber: number;
  description: string;
  shotType: string | null;
  status: string;
  takeCount: number;
  circledTake: number | null;
  quickNotes: string | null;
  supervisorNotes: string | null;
  continuityNotes: string | null;
  isFlagged: boolean;
  statusChangedAt: Date | null;
  takeNotes: {
    takeNum: number;
    rating: string | null;
    notes: string | null;
    timecode: string | null;
  }[];
}

interface SceneGroup {
  sceneId: string;
  sceneName: string;
  shots: ShotWithNotes[];
  totalTakes: number;
  completedShots: number;
}

// GET /api/screenplays/[id]/wrap-report - Generate wrap report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const access = await checkScreenplayAccess(id, session.user.id);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const screenplay = access.screenplay!;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const callsheetId = searchParams.get("callsheetId");

    // Build query for shots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      screenplayId: id,
      status: { in: ["shot", "approved"] },
    };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);
      whereClause.statusChangedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // If callsheetId is provided, get scenes from that callsheet
    let callsheet = null;
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
      });

      // Extract scene IDs from callsheet data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callsheetData = callsheet?.data as any;
      if (callsheetData?.scenes) {
        const sceneIds = callsheetData.scenes.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.sceneId || s.id
        );
        whereClause.sceneId = { in: sceneIds };
      }
    }

    // Get all completed shots with take notes
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
    });

    // Extract scenes from screenplay content to get scene names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screenplayContent = screenplay.content as any;
    const sceneMap = new Map<string, string>();

    if (screenplayContent?.content) {
      for (const node of screenplayContent.content) {
        if (node.type === "scene_heading" && node.attrs?.sceneId) {
          // Get scene text from first child
          const sceneText =
            node.content?.[0]?.text || `Scene ${node.attrs.sceneId}`;
          sceneMap.set(node.attrs.sceneId, sceneText);
        }
      }
    }

    // Group shots by scene
    const sceneGroups = new Map<string, SceneGroup>();

    for (const shot of shots) {
      if (!sceneGroups.has(shot.sceneId)) {
        sceneGroups.set(shot.sceneId, {
          sceneId: shot.sceneId,
          sceneName: sceneMap.get(shot.sceneId) || `Scene ${shot.sceneId}`,
          shots: [],
          totalTakes: 0,
          completedShots: 0,
        });
      }

      const group = sceneGroups.get(shot.sceneId)!;
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
      });
      group.totalTakes += shot.takeCount;
      group.completedShots += 1;
    }

    // Calculate totals
    const totalShots = shots.length;
    const totalTakes = shots.reduce((sum, s) => sum + s.takeCount, 0);
    const approvedShots = shots.filter((s) => s.status === "approved").length;
    const flaggedShots = shots.filter((s) => s.isFlagged).length;
    const avgTakesPerShot = totalShots > 0 ? totalTakes / totalShots : 0;

    // Calculate circled takes ratio
    const shotsWithCircled = shots.filter((s) => s.circledTake !== null).length;

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error generating wrap report:", error);
    return NextResponse.json(
      { error: "Failed to generate wrap report" },
      { status: 500 }
    );
  }
}
