import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
});

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createTeamSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = validatedData.data;

    // Create team with owner as first member
    const team = await prisma.team.create({
      data: {
        name,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
