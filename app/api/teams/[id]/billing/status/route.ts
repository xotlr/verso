import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeamBillingStatus } from "@/lib/stripe-helpers";

// GET /api/teams/[id]/billing/status - Get team billing status
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

    // Check if user is a member (any member can view billing status)
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
      select: { ownerId: true },
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

    const billingStatus = await getTeamBillingStatus(id);

    return NextResponse.json(billingStatus);
  } catch (error) {
    console.error("Error fetching billing status:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing status" },
      { status: 500 }
    );
  }
}
