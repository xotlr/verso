import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invites/[token] - Get invite details (public, no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            _count: {
              select: { members: true },
            },
          },
        },
        inviter: {
          select: { id: true, name: true, image: true },
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
      // Delete expired invite
      await prisma.teamInvite.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      team: invite.team,
      inviter: invite.inviter,
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite" },
      { status: 500 }
    );
  }
}
