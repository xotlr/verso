import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api"
import { createServerActionClient } from "@/lib/supabase/server"

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

const updateApplicationSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

export const PATCH = createApiHandler({
  auth: "required",
  schema: updateApplicationSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id: projectId, needId, appId } = params

    const isOwner = await isProjectOwner(projectId, user.id)
    if (!isOwner) {
      throw new ForbiddenError("Only project owner can update applications")
    }

    // Get application with roleNeed and user info
    const { data: application, error: fetchError } = await supabase
      .from("ProjectRoleApplication")
      .select(`
        id,
        userId,
        status,
        roleNeed:ProjectRoleNeed!roleNeedId(
          id,
          role,
          projectId
        ),
        user:User!userId(
          id,
          name
        )
      `)
      .eq("id", appId)
      .eq("roleNeedId", needId)
      .single()

    if (fetchError?.code === "PGRST116" || !application) {
      throw new NotFoundError("Application")
    }
    if (fetchError) throw fetchError

    const roleNeed = application.roleNeed as { id: string; role: string; projectId: string }
    const appUser = application.user as { id: string; name: string | null }

    if (roleNeed.projectId !== projectId) {
      throw new NotFoundError("Application")
    }

    const { data: updatedApplication, error: updateError } = await supabase
      .from("ProjectRoleApplication")
      .update({ status: data.status })
      .eq("id", appId)
      .select()
      .single()

    if (updateError) throw updateError

    if (data.status === "ACCEPTED") {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("ProjectRole")
        .select("id")
        .eq("projectId", projectId)
        .eq("userId", application.userId)
        .eq("role", roleNeed.role)
        .single()

      if (!existingRole) {
        // Check for unfilled slot
        const { data: unfilledSlot } = await supabase
          .from("ProjectRole")
          .select("id")
          .eq("projectId", projectId)
          .eq("role", roleNeed.role)
          .is("userId", null)
          .limit(1)
          .single()

        if (unfilledSlot) {
          await supabase
            .from("ProjectRole")
            .update({
              userId: application.userId,
              name: appUser.name || "Team Member",
            })
            .eq("id", unfilledSlot.id)
        } else {
          await supabase
            .from("ProjectRole")
            .insert({
              projectId,
              role: roleNeed.role,
              name: appUser.name || "Team Member",
              userId: application.userId,
            })
        }
      }

      // Create activity
      await supabase
        .from("Activity")
        .insert({
          userId: user.id,
          type: "role_accepted",
          entityId: projectId,
          entityTitle: `${appUser.name} as ${roleNeed.role}`,
        })
    }

    return updatedApplication
  },
})

export const DELETE = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id: projectId, needId, appId } = params

    const { data: application, error: fetchError } = await supabase
      .from("ProjectRoleApplication")
      .select(`
        id,
        userId,
        status,
        roleNeed:ProjectRoleNeed!roleNeedId(projectId)
      `)
      .eq("id", appId)
      .eq("roleNeedId", needId)
      .single()

    if (fetchError?.code === "PGRST116" || !application) {
      throw new NotFoundError("Application")
    }
    if (fetchError) throw fetchError

    const roleNeed = application.roleNeed as { projectId: string }

    if (roleNeed.projectId !== projectId) {
      throw new NotFoundError("Application")
    }

    if (application.userId !== user.id) {
      throw new ForbiddenError("You can only withdraw your own application")
    }

    if (application.status !== "PENDING") {
      throw new BadRequestError("Can only withdraw pending applications")
    }

    const { error: deleteError } = await supabase
      .from("ProjectRoleApplication")
      .delete()
      .eq("id", appId)

    if (deleteError) throw deleteError

    return { success: true }
  },
})
