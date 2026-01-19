import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { generateCallsheetHTML, generateCallsheetText } from "@/lib/export/callsheet"
import { CallsheetData } from "@/types/callsheet"
import { createServerActionClient } from "@/lib/supabase/server"

interface CallsheetAccessResult {
  allowed: boolean
  notFound: boolean
  callsheet: { id: string; userId: string } | null
}

async function checkCallsheetAccess(callsheetId: string, userId: string): Promise<CallsheetAccessResult> {
  const supabase = await createServerActionClient()

  const { data, error } = await supabase
    .from("Callsheet")
    .select(`
      id,
      userId,
      project:Project!projectId(
        id,
        team:Team(
          id,
          members:TeamMember(userId)
        )
      )
    `)
    .eq("id", callsheetId)
    .single()

  if (error?.code === "PGRST116" || !data) {
    return { allowed: false, notFound: true, callsheet: null }
  }
  if (error) throw error

  const callsheet = data as {
    id: string
    userId: string
    project: {
      id: string
      team: { id: string; members: { userId: string }[] } | null
    }
  }

  if (callsheet.userId === userId) {
    return { allowed: true, notFound: false, callsheet }
  }

  if (callsheet.project?.team && Array.isArray(callsheet.project.team.members)) {
    const isMember = callsheet.project.team.members.some((m) => m.userId === userId)
    if (isMember) {
      return { allowed: true, notFound: false, callsheet }
    }
  }

  return { allowed: false, notFound: false, callsheet: null }
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, searchParams, supabase }) => {
    const { id } = params

    const access = await checkCallsheetAccess(id, user.id)

    if (access.notFound) {
      throw new NotFoundError("Callsheet")
    }

    if (!access.allowed) {
      throw new ForbiddenError("Access denied")
    }

    const format = searchParams.get("format") || "html"

    const { data: callsheet, error } = await supabase
      .from("Callsheet")
      .select(`
        *,
        project:Project!projectId(id, name)
      `)
      .eq("id", id)
      .single()

    if (error?.code === "PGRST116" || !callsheet) {
      throw new NotFoundError("Callsheet")
    }
    if (error) throw error

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
