import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logTeamAction } from "@/lib/audit-log";

// DELETE /api/teams/[id]/invites/[inviteId] - Cancel/revoke an invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await auth();
    const { id, inviteId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the invite
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: { team: true },
    });

    if (!invite || invite.teamId !== id) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: session.user.id,
        },
      },
    });

    const canRevoke = invite.team.ownerId === session.user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"));

    if (!canRevoke) {
      return NextResponse.json(
        { error: "Only owners and admins can revoke invites" },
        { status: 403 }
      );
    }

    await prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    // Log audit event
    await logTeamAction({
      teamId: id,
      actorId: session.user.id,
      action: "invite_revoked",
      targetType: "invite",
      targetId: inviteId,
      metadata: { email: invite.email, role: invite.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}
