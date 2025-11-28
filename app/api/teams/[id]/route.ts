import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTeamSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  banner: z.string().url().nullable().optional(),
  logo: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/teams/[id] - Get team details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                title: true,
                createdAt: true,
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            createdAt: true,
            _count: {
              select: { screenplays: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
        invites: {
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
            invites: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const isMember = team.members.some((m) => m.userId === session.user.id);
    if (!isMember && team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const membership = team.members.find((m) => m.userId === session.user.id);
    const canEdit = team.ownerId === session.user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"));

    if (!canEdit) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateTeamSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: validatedData.data,
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Only owner can delete team
    if (team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the team owner can delete the team" },
        { status: 403 }
      );
    }

    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
