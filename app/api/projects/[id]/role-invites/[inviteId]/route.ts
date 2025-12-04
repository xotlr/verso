import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/projects/[id]/role-invites/[inviteId] - Revoke an invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, inviteId } = await params

    // Verify user owns the project or is the inviter
    const invite = await prisma.projectRoleInvite.findFirst({
      where: {
        id: inviteId,
        projectId,
      },
      include: {
        project: {
          select: {
            userId: true,
            team: {
              select: {
                members: {
                  where: { userId: session.user.id },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    // Check if user can revoke (project owner, team admin, or original inviter)
    const isProjectOwner = invite.project.userId === session.user.id
    const isTeamAdmin = invite.project.team?.members.some(
      (m) => m.role === "OWNER" || m.role === "ADMIN"
    )
    const isInviter = invite.invitedBy === session.user.id

    if (!isProjectOwner && !isTeamAdmin && !isInviter) {
      return NextResponse.json(
        { error: "Not authorized to revoke this invite" },
        { status: 403 }
      )
    }

    await prisma.projectRoleInvite.delete({
      where: { id: inviteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error revoking project role invite:", error)
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    )
  }
}
