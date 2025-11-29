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

// Validation schema for updating a shot
const updateShotSchema = z.object({
  sceneId: z.string().min(1).optional(),
  shotNumber: z.number().int().positive().optional(),
  description: z.string().min(1).optional(),
  shotType: z.enum(SHOT_TYPES).nullable().optional(),
  cameraAngle: z.enum(CAMERA_ANGLES).nullable().optional(),
  movement: z.enum(CAMERA_MOVEMENTS).nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  lens: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  audio: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(SHOT_STATUSES).optional(),
});

// Helper to check screenplay access
async function checkScreenplayAccess(screenplayId: string, userId: string) {
  const screenplay = await prisma.screenplay.findUnique({
    where: { id: screenplayId },
    select: { userId: true, teamId: true },
  });

  if (!screenplay) return null;

  if (screenplay.userId === userId) return screenplay;

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

// GET /api/screenplays/[id]/shots/[shotId] - Get a single shot
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: screenplayId, shotId } = await params;

    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id);
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      );
    }

    const shot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    });

    if (!shot) {
      return NextResponse.json(
        { error: "Shot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(shot);
  } catch (error) {
    console.error("Error fetching shot:", error);
    return NextResponse.json(
      { error: "Failed to fetch shot" },
      { status: 500 }
    );
  }
}

// PUT /api/screenplays/[id]/shots/[shotId] - Update a shot
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: screenplayId, shotId } = await params;

    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id);
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      );
    }

    // Check shot exists
    const existingShot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    });

    if (!existingShot) {
      return NextResponse.json(
        { error: "Shot not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateShotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    const shot = await prisma.shot.update({
      where: { id: shotId },
      data: {
        ...(data.sceneId !== undefined && { sceneId: data.sceneId }),
        ...(data.shotNumber !== undefined && { shotNumber: data.shotNumber }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.shotType !== undefined && { shotType: data.shotType }),
        ...(data.cameraAngle !== undefined && { cameraAngle: data.cameraAngle }),
        ...(data.movement !== undefined && { movement: data.movement }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.lens !== undefined && { lens: data.lens }),
        ...(data.equipment !== undefined && { equipment: data.equipment }),
        ...(data.lighting !== undefined && { lighting: data.lighting }),
        ...(data.audio !== undefined && { audio: data.audio }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return NextResponse.json(shot);
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

// DELETE /api/screenplays/[id]/shots/[shotId] - Delete a shot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: screenplayId, shotId } = await params;

    const screenplay = await checkScreenplayAccess(screenplayId, session.user.id);
    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found or access denied" },
        { status: 404 }
      );
    }

    // Check shot exists
    const existingShot = await prisma.shot.findUnique({
      where: { id: shotId, screenplayId },
    });

    if (!existingShot) {
      return NextResponse.json(
        { error: "Shot not found" },
        { status: 404 }
      );
    }

    await prisma.shot.delete({
      where: { id: shotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json(
      { error: "Failed to delete shot" },
      { status: 500 }
    );
  }
}
