import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/teams/[id]/audit-log - List team audit logs
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

    // Check if user is owner or admin (only they can view audit logs)
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

    const canViewAudit = team.ownerId === session.user.id ||
      (membership && (membership.role === "OWNER" || membership.role === "ADMIN"));

    if (!canViewAudit) {
      return NextResponse.json(
        { error: "Only owners and admins can view audit logs" },
        { status: 403 }
      );
    }

    // Parse query params for pagination
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const cursor = url.searchParams.get("cursor");
    const action = url.searchParams.get("action"); // Optional filter by action type

    const where = {
      teamId: id,
      ...(action && { action }),
    };

    const auditLogs = await prisma.teamAuditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Take one extra to check if there's more
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    // Check if there's a next page
    let nextCursor: string | null = null;
    if (auditLogs.length > limit) {
      const nextItem = auditLogs.pop();
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json({
      logs: auditLogs,
      nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
