import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/screenplays/[id]/recent - Remove screenplay from recent history
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify user owns the screenplay or is in the team
    const screenplay = await prisma.screenplay.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          {
            team: {
              members: {
                some: { userId: session.user.id },
              },
            },
          },
        ],
      },
    });

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found" },
        { status: 404 }
      );
    }

    // Clear lastOpenedAt to remove from recent
    await prisma.screenplay.update({
      where: { id },
      data: { lastOpenedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from recent:", error);
    return NextResponse.json(
      { error: "Failed to remove from recent" },
      { status: 500 }
    );
  }
}
