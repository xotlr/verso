import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/teams/[id]/members - List team members
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

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/members - Add a member by email
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
    const [memberCount, inviteCount] = await Promise.all([
      prisma.teamMember.count({ where: { teamId: id } }),
      prisma.teamInvite.count({ where: { teamId: id } }),
    ]);
    const totalSeats = memberCount + inviteCount;

    if (totalSeats >= team.maxSeats) {
      return NextResponse.json(
        { error: "SEAT_LIMIT_REACHED", message: `Team has reached the maximum of ${team.maxSeats} seats. Upgrade to add more members.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = addMemberSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validatedData.data;

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: "User not found. They need to create an account first." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 400 }
      );
    }

    // Add member
    const newMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
