import { createApiHandler, NotFoundError, handleSupabaseError } from "@/lib/api"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    // RLS policy ensures user has access
    const { data: screenplay, error: screenplayError } = await supabase
      .from("Screenplay")
      .select(`
        *,
        project:Project(id, name),
        team:Team(id, name),
        series:Series(id, title),
        seasonRef:Season(id, number, title)
      `)
      .eq("id", id)
      .single()

    if (screenplayError?.code === "PGRST116" || !screenplay) {
      throw new NotFoundError("Screenplay")
    }
    if (screenplayError) handleSupabaseError(screenplayError, "Screenplay")

    // Update lastOpenedAt (silently fails if no edit access, which is fine for viewers)
    await supabase
      .from("Screenplay")
      .update({ lastOpenedAt: new Date().toISOString() })
      .eq("id", id)

    // Fetch shots for this screenplay (RLS inherits access from screenplay)
    const { data: shots, error: shotsError } = await supabase
      .from("Shot")
      .select("*")
      .eq("screenplayId", id)
      .order("sceneId", { ascending: true })
      .order("shotNumber", { ascending: true })

    if (shotsError) handleSupabaseError(shotsError, "Shot")

    // Determine access level for UI hints
    const isOwner = screenplay.userId === user.id
    let shareRole: string | undefined

    if (!isOwner) {
      const { data: share } = await supabase
        .from("ScreenplayShare")
        .select("role")
        .eq("screenplayId", id)
        .eq("userId", user.id)
        .single()

      shareRole = share?.role
    }

    return {
      screenplay,
      shots: shots || [],
      access: {
        isOwner,
        shareRole,
      },
    }
  },
})
