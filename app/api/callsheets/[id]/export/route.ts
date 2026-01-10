import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { generateCallsheetHTML, generateCallsheetText } from "@/lib/export/callsheet"
import { CallsheetData } from "@/types/callsheet"

async function checkCallsheetAccess(callsheetId: string, userId: string) {
  const callsheet = await prisma.callsheet.findUnique({
    where: { id: callsheetId },
    include: {
      project: {
        include: {
          team: {
            include: { members: { where: { userId } } },
          },
        },
      },
    },
  })

  if (!callsheet) {
    return { allowed: false, notFound: true, callsheet: null }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, notFound: false, callsheet }
  }

  if (callsheet.project?.team && callsheet.project.team.members.length > 0) {
    return { allowed: true, notFound: false, callsheet }
  }

  return { allowed: false, notFound: false, callsheet: null }
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const format = searchParams.get("format") || "html"

    const callsheet = await prisma.callsheet.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    if (!callsheet) {
      throw new NotFoundError("Callsheet")
    }

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
            "Content-Disposition": `attachment; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, "_")}_callsheet.txt"`,
          },
        })
      }

      case "pdf": {
        const htmlContent = generateCallsheetHTML(callsheetForExport, true)
        return new NextResponse(htmlContent, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, "_")}_callsheet.html"`,
          },
        })
      }

      case "html":
      default: {
        const htmlContent = generateCallsheetHTML(callsheetForExport, false)
        return new NextResponse(htmlContent, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `inline; filename="${callsheet.title.replace(/[^a-zA-Z0-9]/g, "_")}_callsheet.html"`,
          },
        })
      }
    }
  },
})
