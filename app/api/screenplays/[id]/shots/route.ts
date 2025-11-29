import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
} from "@/types/shotlist";

// Validation schema for creating a shot
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
});

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: { userId: true, teamId: true },
  });

  if (!screenplay) return null;

  // Check direct ownership
  if (screenplay.userId === userId) return screenplay;

  // Check team membership
  if (screenplay.teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: screenplay.teamId,
          userId,
        },
      },
    });
    if (membership) return screenplay;
  }

  return null;
}

// GET /api/screenplays/[id]/shots - List all shots for screenplay
export async function GET(
  request: Request,
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

    const { id: screenplayId } = await params;

    // Check access
    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id);
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      );
    }

    // Get all shots for this screenplay, ordered by scene and shot number
    const shots = await prisma.shot.findMany({
      where: { screenplayId },
      orderBy: [
        { sceneId: "asc" },
        { shotNumber: "asc" },
      ],
    });

    return NextResponse.json({ shots });
  } catch (error) {
    console.error("Error fetching shots:", error);
    return NextResponse.json(
      { error: "Failed to fetch shots" },
      { status: 500 }
    );
  }
}

// POST /api/screenplays/[id]/shots - Create a new shot
export async function POST(
  request: Request,
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

    const { id: screenplayId } = await params;

    // Check access
    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id);
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = createShotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Get the next shot number for this scene
    const lastShot = await prisma.shot.findFirst({
      where: {
        screenplayId,
        sceneId: data.sceneId,
      },
      orderBy: { shotNumber: "desc" },
      select: { shotNumber: true },
    });

    const shotNumber = (lastShot?.shotNumber ?? 0) + 1;

    // Create the shot
    const shot = await prisma.shot.create({
      data: {
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
      },
    });

    return NextResponse.json(shot, { status: 201 });
  } catch (error) {
    console.error("Error creating shot:", error);
    return NextResponse.json(
      { error: "Failed to create shot" },
      { status: 500 }
    );
  }
}
