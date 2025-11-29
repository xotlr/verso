import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logTeamAction } from "@/lib/audit-log";

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/teams/[id]/invites - List pending invites
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

    // Check if user is a member
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: session.user.id,
        },
      },
    });

    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const isMember = membership || team.ownerId === session.user.id;
    if (!isMember) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: id },
      include: {
        inviter: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/invites - Create an invite
export async function POST(
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

    // Check if user is owner or admin
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: session.user.id,
        },
      },
    });

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true, invites: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const canInvite = team.ownerId === session.user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"));

    if (!canInvite) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    // Check seat limits
    const totalSeats = team._count.members + team._count.invites;
    if (totalSeats >= team.maxSeats) {
      return NextResponse.json(
        { error: "SEAT_LIMIT_REACHED", message: `Team has reached the maximum of ${team.maxSeats} seats. Upgrade to add more members.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createInviteSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validatedData.data;

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMembership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this team" },
          { status: 400 }
        );
      }
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findUnique({
      where: {
        teamId_email: {
          teamId: id,
          email,
        },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite has already been sent to this email" },
        { status: 400 }
      );
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: id,
        email,
        role,
        expiresAt,
        invitedBy: session.user.id,
      },
      include: {
        inviter: {
          select: { id: true, name: true, email: true, image: true },
        },
        team: {
          select: { id: true, name: true, logo: true },
        },
      },
    });

    // Log audit event
    await logTeamAction({
      teamId: id,
      actorId: session.user.id,
      action: "invite_sent",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email, role },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
