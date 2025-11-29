import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTeamCheckoutSession } from "@/lib/stripe-helpers";
import { logTeamAction } from "@/lib/audit-log";

// POST /api/teams/[id]/billing/checkout - Create Stripe checkout session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only team owner can manage billing
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        stripeSubscriptionId: true,
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
        { error: "Only the team owner can manage billing" },
        { status: 403 }
      );
    }

    // Check if team already has an active subscription
    if (team.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Team already has an active subscription. Use the billing portal to manage it." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await createTeamCheckoutSession({
      teamId: team.id,
      teamName: team.name,
      ownerEmail: session.user.email,
      ownerId: session.user.id,
      priceId,
      successUrl: `${origin}/teams/${team.id}/settings?tab=billing&success=true`,
      cancelUrl: `${origin}/teams/${team.id}/settings?tab=billing&canceled=true`,
    });

    // Log audit event
    await logTeamAction({
      teamId: id,
      actorId: session.user.id,
      action: "billing_updated",
      targetType: "billing",
      metadata: { action: "checkout_initiated", priceId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
