import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCallsheetHTML, generateCallsheetText } from "@/lib/export/callsheet"
import { CallsheetData } from "@/types/callsheet"

// Helper to check callsheet access
async function checkCallsheetAccess(callsheetId: string, userId: string) {
  const callsheet = await prisma.callsheet.findUnique({
    where: { id: callsheetId },
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

  if (!callsheet) {
    return { allowed: false, error: "Callsheet not found", status: 404 }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, callsheet }
  }

  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, callsheet }
  }

  return { allowed: false, error: "Access denied", status: 403 }
}

// GET /api/callsheets/[id]/export?format=html|txt|pdf
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
    const access = await checkCallsheetAccess(id, session.user.id)

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "html"

    const callsheet = await prisma.callsheet.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!callsheet) {
      return NextResponse.json(
        { error: "Callsheet not found" },
        { status: 404 }
      )
    }

    // Prepare callsheet data for export
    const callsheetForExport = {
      ...callsheet,
      data: callsheet.data as CallsheetData | null,
    }

    switch (format) {
      case "txt": {
        const textContent = generateCallsheetText(callsheetForExport)
        return new NextResponse(textContent, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_callsheet.txt"`,
          },
        })
      }

      case "pdf": {
        // For PDF, we return HTML that can be printed/saved as PDF client-side
        // or used with a PDF generation service
        const htmlContent = generateCallsheetHTML(callsheetForExport, true)
        return new NextResponse(htmlContent, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_callsheet.html"`,
          },
        })
      }

      case "html":
      default: {
        const htmlContent = generateCallsheetHTML(callsheetForExport, false)
        return new NextResponse(htmlContent, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_callsheet.html"`,
          },
        })
      }
    }
  } catch (error) {
    console.error("Error exporting callsheet:", error)
    return NextResponse.json(
      { error: "Failed to export callsheet" },
      { status: 500 }
    )
  }
}
