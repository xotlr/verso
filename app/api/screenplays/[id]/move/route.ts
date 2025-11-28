import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const moveScreenplaySchema = z.object({
  projectId: z.string().nullable(), // null = make standalone
})

// PUT /api/screenplays/[id]/move - Move screenplay to/from project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get current screenplay
    const screenplay = await prisma.screenplay.findUnique({
      where: { id },
      include: {
        project: { select: { teamId: true } },
        team: { select: { id: true } },
      },
    })

    if (!screenplay) {
      return NextResponse.json(
        { error: "Screenplay not found" },
        { status: 404 }
      )
    }

    // Check if user has access to the screenplay
    let hasAccess = screenplay.userId === session.user.id

    if (!hasAccess) {
      const teamId = screenplay.teamId || screenplay.project?.teamId
      if (teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId,
              userId: session.user.id,
            },
          },
        })
        hasAccess = !!membership
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = moveScreenplaySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { projectId } = result.data

    // If moving to a project, verify access to that project
    if (projectId) {
      const targetProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, teamId: true },
      })

      if (!targetProject) {
        return NextResponse.json(
          { error: "Target project not found" },
          { status: 404 }
        )
      }

      // Check access to target project
      let hasProjectAccess = targetProject.userId === session.user.id

      if (!hasProjectAccess && targetProject.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: targetProject.teamId,
              userId: session.user.id,
            },
          },
        })
        hasProjectAccess = !!membership
      }

      if (!hasProjectAccess) {
        return NextResponse.json(
          { error: "Access denied to target project" },
          { status: 403 }
        )
      }
    }

    // Update the screenplay
    const updatedScreenplay = await prisma.screenplay.update({
      where: { id },
      data: {
        projectId,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updatedScreenplay)
  } catch (error) {
    console.error("Error moving screenplay:", error)
    return NextResponse.json(
      { error: "Failed to move screenplay" },
      { status: 500 }
    )
  }
}
