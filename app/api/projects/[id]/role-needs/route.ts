import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError } from "@/lib/api"
import { getSession } from "@/lib/supabase-auth"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { createServerActionClient } from "@/lib/supabase/server"

interface ProjectWithTeam {
  id: string
  userId: string
  team: { id: string; members: Array<{ userId: string }> } | null
}

async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerActionClient()

  const result = await supabase
    .from("Project")
    .select(`
      id,
      userId,
      team:Team(
        id,
        members:TeamMember(userId)
      )
    `)
    .eq("id", projectId)
    .single()

  const project = result.data as ProjectWithTeam | null
  if (result.error || !project) return false
  if (project.userId === userId) return true
  if (project.team && Array.isArray(project.team.members)) {
    const isMember = project.team.members.some((m: { userId: string }) => m.userId === userId)
    if (isMember) return true
  }

  return false
}

async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerActionClient()

  const result = await supabase
    .from("Project")
    .select("userId")
    .eq("id", projectId)
    .single()

  const project = result.data as { userId: string } | null
  return project?.userId === userId
}

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
    if (projectError) throw projectError

    const session = await getSession()
    const isOwner = session?.user?.id === project.userId

    if (!project.isPublic) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const hasAccess = await hasProjectAccess(projectId, session.user.id)
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

      if (error) throw error

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

      if (error) throw error
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
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
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

    if (error) throw error

    return roleNeed
  },
})
