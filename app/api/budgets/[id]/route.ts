import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Helper to check budget access
async function checkBudgetAccess(budgetId: string, userId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      project: {
        include: {
          team: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  })

  if (!budget) {
    return { allowed: false, error: "Budget not found", status: 404 }
  }

  if (budget.userId === userId) {
    return { allowed: true, budget }
  }

  if (budget.project?.team && budget.project.team.members.length > 0) {
    return { allowed: true, budget }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/budgets/[id]
export async function GET(
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
    const access = await checkBudgetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    return NextResponse.json(access.budget)
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    )
  }
}

const updateBudgetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  total: z.number().optional(),
  data: z.any().optional(),
})

// PUT /api/budgets/[id]
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
    const access = await checkBudgetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const body = await request.json()
    const result = updateBudgetSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(
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
    const access = await checkBudgetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    await prisma.budget.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
