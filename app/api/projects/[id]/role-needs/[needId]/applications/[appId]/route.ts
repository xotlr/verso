import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string; needId: string; appId: string }>
}

// Helper to check if user owns the project
async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })
  return project?.userId === userId
}

// Validation schema for updating application status
const updateApplicationSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

// PATCH /api/projects/[id]/role-needs/[needId]/applications/[appId] - Accept/Decline (owner only)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId, appId } = await params
    const body = await request.json()
    const result = updateApplicationSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    // Only project owner can update application status
    const isOwner = await isProjectOwner(projectId, session.user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only project owner can update applications" },
        { status: 403 }
      )
    }

    // Verify application exists
    const application = await prisma.projectRoleApplication.findFirst({
      where: {
        id: appId,
        roleNeedId: needId,
        roleNeed: {
          projectId,
        },
      },
      include: {
        roleNeed: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    // Update application status
    const updatedApplication = await prisma.projectRoleApplication.update({
      where: { id: appId },
      data: { status: result.data.status },
    })

    // If accepted, create a ProjectRole for this user
    if (result.data.status === "ACCEPTED") {
      // First, check if user already has this role
      const existingRole = await prisma.projectRole.findFirst({
        where: {
          projectId,
          userId: application.userId,
          role: application.roleNeed.role,
        },
      })

      if (!existingRole) {
        // Try to find an unfilled role slot of the same type
        const unfilledSlot = await prisma.projectRole.findFirst({
          where: {
            projectId,
            role: application.roleNeed.role,
            userId: null,
          },
        })

        if (unfilledSlot) {
          // Fill the existing slot
          await prisma.projectRole.update({
            where: { id: unfilledSlot.id },
            data: {
              userId: application.userId,
              name: application.user.name || "Team Member",
            },
          })
        } else {
          // Create a new role entry
          await prisma.projectRole.create({
            data: {
              projectId,
              role: application.roleNeed.role,
              name: application.user.name || "Team Member",
              userId: application.userId,
            },
          })
        }
      }

      // Create activity record for acceptance
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          type: "role_accepted",
          entityId: projectId,
          entityTitle: `${application.user.name} as ${application.roleNeed.role}`,
        },
      })
    }

    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error("Error updating application:", error)
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/role-needs/[needId]/applications/[appId] - Withdraw (applicant only)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id: projectId, needId, appId } = await params

    // Find the application
    const application = await prisma.projectRoleApplication.findFirst({
      where: {
        id: appId,
        roleNeedId: needId,
        roleNeed: {
          projectId,
        },
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    // Only the applicant can withdraw their own application
    if (application.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only withdraw your own application" },
        { status: 403 }
      )
    }

    // Can only withdraw pending applications
    if (application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only withdraw pending applications" },
        { status: 400 }
      )
    }

    await prisma.projectRoleApplication.delete({
      where: { id: appId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json(
      { error: "Failed to withdraw application" },
      { status: 500 }
    )
  }
}
