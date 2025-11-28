import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/invites - Get all pending invites for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all invites for this user's email
    const invites = await prisma.teamInvite.findMany({
      where: {
        email: session.user.email,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("Error fetching user invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}
