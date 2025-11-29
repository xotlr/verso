import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamPortalSession } from "@/lib/stripe-helpers";

// POST /api/teams/[id]/billing/portal - Create Stripe billing portal session
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

    // Only team owner can access billing portal
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        stripeCustomerId: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    if (team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the team owner can access billing" },
        { status: 403 }
      );
    }

    if (!team.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 400 }
      );
    }

    // Get origin for return URL
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${origin}/teams/${team.id}/settings?tab=billing`;

    const portalSession = await createTeamPortalSession(team.id, returnUrl);

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
