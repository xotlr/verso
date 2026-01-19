import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError, RATE_LIMITS } from "@/lib/api"
import { getSession } from "@/lib/supabase-auth"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { createServerActionClient } from "@/lib/supabase/server"
import { hasProjectAccess, isProjectOwner } from "@/lib/project-access"

const createRoleNeedSchema = z.object({
  role: z.string().min(1, "Role is required"),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  isPaid: z.boolean().default(false),
})

// GET - Mixed auth (public projects don't require auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  try {
    const supabase = await createServerActionClient()

    const projectResult = await supabase
      .from("Project")
      .select("isPublic, userId")
      .eq("id", projectId)
      .single()

    const project = projectResult.data as { isPublic: boolean; userId: string } | null
    const projectError = projectResult.error

    if (projectError?.code === "PGRST116" || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    if (projectError) handleSupabaseError(projectError, "Project")

    const session = await getSession()
    const isOwner = session?.user?.id === project.userId

    if (!project.isPublic) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const hasAccess = await hasProjectAccess(supabase, projectId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
    }

    let roleNeeds
    if (isOwner) {
      // Include application counts for owner
      const { data, error } = await supabase
        .from("ProjectRoleNeed")
        .select(`
          *,
          applications:ProjectRoleApplication(id)
        `)
        .eq("projectId", projectId)
        .order("createdAt", { ascending: false })

      if (error) handleSupabaseError(error, "RoleNeed")

      // Transform to include _count
      roleNeeds = (data || []).map((need: { applications?: { id: string }[] }) => ({
        ...need,
        _count: {
          applications: need.applications?.length || 0,
        },
        applications: undefined,
      }))
    } else {
      const { data, error } = await supabase
        .from("ProjectRoleNeed")
        .select("*")
        .eq("projectId", projectId)
        .order("createdAt", { ascending: false })

      if (error) handleSupabaseError(error, "RoleNeed")
      roleNeeds = data || []
    }

    return NextResponse.json(roleNeeds)
  } catch (error) {
    logger.error("Failed to fetch role needs", error instanceof Error ? error : undefined, {
      projectId,
    })
    return NextResponse.json({ error: "Failed to fetch role needs" }, { status: 500 })
  }
}

export const POST = createApiHandler({
  auth: "required",
  schema: createRoleNeedSchema,
  rateLimit: RATE_LIMITS.API,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const isOwner = await isProjectOwner(supabase, projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can add role needs")
    }

    const { data: roleNeed, error } = await supabase
      .from("ProjectRoleNeed")
      .insert({
        projectId,
        role: data.role,
        description: data.description,
        location: data.location,
        isPaid: data.isPaid,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error, "RoleNeed")

    return roleNeed
  },
})
