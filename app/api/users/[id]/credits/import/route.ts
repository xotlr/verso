import { createApiHandler, ForbiddenError, BadRequestError } from "@/lib/api"

export const POST = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    if (user.id !== id) {
      throw new ForbiddenError()
    }

    // Get project roles for the user
    const { data: projectRoles, error: rolesError } = await supabase
      .from("ProjectRole")
      .select(`
        id, role,
        project:Project(id, name, createdAt)
      `)
      .eq("userId", id)

    if (rolesError) throw rolesError

    if (!projectRoles || projectRoles.length === 0) {
      return { message: "No project roles found to import", imported: 0 }
    }

    // Get existing credits
    const { data: existingCredits, error: creditsError } = await supabase
      .from("Credit")
      .select("title, role, year")
      .eq("userId", id)

    if (creditsError) throw creditsError

    const existingSet = new Set(
      (existingCredits || []).map((c: { title: string; role: string; year: number }) => `${c.title}|${c.role}|${c.year}`)
    )

    // Get max display order
    const { data: maxOrderData } = await supabase
      .from("Credit")
      .select("displayOrder")
      .eq("userId", id)
      .order("displayOrder", { ascending: false })
      .limit(1)
      .single()

    let nextOrder = ((maxOrderData?.displayOrder as number) ?? -1) + 1

    // Get current count
    const { count: currentCount } = await supabase
      .from("Credit")
      .select("*", { count: "exact", head: true })
      .eq("userId", id)

    const remainingSlots = 10 - (currentCount || 0)

    if (remainingSlots <= 0) {
      throw new BadRequestError(
        "Maximum 10 credits allowed. Remove some to import more."
      )
    }

    type ProjectRole = {
      id: string
      role: string
      project: { id: string; name: string; createdAt: string } | null
    }

    // Filter and prepare credits to create
    const creditsToCreate = projectRoles
      .filter((pr: ProjectRole) => {
        const project = pr.project
        if (!project) return false
        const year = new Date(project.createdAt).getFullYear()
        const key = `${project.name}|${pr.role}|${year}`
        return !existingSet.has(key)
      })
      .slice(0, remainingSlots)
      .map((pr: ProjectRole) => {
        const project = pr.project as { id: string; name: string; createdAt: string }
        return {
          userId: id,
          title: project.name,
          role: pr.role,
          year: new Date(project.createdAt).getFullYear(),
          projectId: project.id,
          isManual: false,
          displayOrder: nextOrder++,
        }
      })

    if (creditsToCreate.length === 0) {
      return { message: "All project roles are already imported", imported: 0 }
    }

    // Insert credits
    const { error: insertError } = await supabase
      .from("Credit")
      .insert(creditsToCreate)

    if (insertError) throw insertError

    return {
      message: `Successfully imported ${creditsToCreate.length} credit(s)`,
      imported: creditsToCreate.length,
    }
  },
})
