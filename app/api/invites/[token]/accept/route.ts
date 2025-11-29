import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logTeamAction } from "@/lib/audit-log";

// POST /api/invites/[token]/accept - Accept an invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    const { token } = await params;

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to accept an invite" },
        { status: 401 }
      );
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true, invites: true },
            },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or has expired" },
        { status: 404 }
      );
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      await prisma.teamInvite.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 }
      );
    }

    // Check if invite email matches the logged-in user
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invite.teamId,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership) {
      // Delete the invite since they're already a member
      await prisma.teamInvite.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 400 }
      );
    }

    // Verify seat limits (exclude this invite from count since we're about to delete it)
    const currentMembers = invite.team._count.members;
    if (currentMembers >= invite.team.maxSeats) {
      return NextResponse.json(
        { error: "Team has reached its seat limit" },
        { status: 403 }
      );
    }

    // Accept invite: create member and delete invite in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the membership
      const member = await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          role: invite.role,
        },
        include: {
          team: {
            select: { id: true, name: true, logo: true },
          },
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      // Delete the invite
      await tx.teamInvite.delete({
        where: { token },
      });

      return member;
    });

    // Log audit event
    await logTeamAction({
      teamId: invite.teamId,
      actorId: session.user.id,
      action: "invite_accepted",
      targetType: "member",
      targetId: session.user.id,
      metadata: {
        inviteId: invite.id,
        role: invite.role,
        teamName: result.team.name,
      },
    });

    return NextResponse.json({
      success: true,
      membership: result,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}

// POST /api/invites/[token]/decline - Decline an invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    const { token } = await params;

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to decline an invite" },
        { status: 401 }
      );
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if invite email matches the logged-in user
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }

    // Store teamId before deleting
    const teamId = invite.teamId;

    await prisma.teamInvite.delete({
      where: { token },
    });

    // Log audit event (optional - decline is less critical but good for completeness)
    await logTeamAction({
      teamId,
      actorId: session.user.id,
      action: "invite_declined",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email: invite.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining invite:", error);
    return NextResponse.json(
      { error: "Failed to decline invite" },
      { status: 500 }
    );
  }
}
