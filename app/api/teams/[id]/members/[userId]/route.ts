import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

// PUT /api/teams/[id]/members/[userId] - Update member role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();
    const { id, userId } = await params;

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

    // Check if current user is owner or admin
    const currentMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: session.user.id,
        },
      },
    });

    const canManage = team.ownerId === session.user.id ||
      (currentMembership && (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"));

    if (!canManage) {
      return NextResponse.json(
        { error: "Only owners and admins can update roles" },
        { status: 403 }
      );
    }

    // Can't change owner's role
    if (userId === team.ownerId) {
      return NextResponse.json(
        { error: "Cannot change the team owner's role" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateRoleSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = validatedData.data;

    const updatedMember = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId: id,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/members/[userId] - Remove member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();
    const { id, userId } = await params;

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

    // Can't remove owner
    if (userId === team.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove the team owner" },
        { status: 400 }
      );
    }

    // Check if current user is owner, admin, or removing themselves
    const currentMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: session.user.id,
        },
      },
    });

    const isSelf = userId === session.user.id;
    const canRemove = isSelf ||
      team.ownerId === session.user.id ||
      (currentMembership && (currentMembership.role === "OWNER" || currentMembership.role === "ADMIN"));

    if (!canRemove) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
