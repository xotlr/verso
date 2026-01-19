import { z } from "zod"
import { createApiHandler, NotFoundError, ForbiddenError, handleSupabaseError } from "@/lib/api"
import { checkScreenplayAccess } from "@/lib/auth-utils"

const createSideSchema = z.object({
  filterType: z.enum(["all", "character", "scenes"]).default("all"),
  filterValue: z.string().optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  callsheetId: z.string().optional().nullable(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { data: sides, error } = await supabase
      .from("DigitalSide")
      .select(`
        *,
        user:User!userId(name)
      `)
      .eq("screenplayId", id)
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Side")

    return { sides: sides || [] }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createSideSchema,
  handler: async ({ user, params, data, supabase }) => {
    const { id } = params

    const access = await checkScreenplayAccess(id, user.id)

    if (!access.allowed) {
      if (access.status === 404) {
        throw new NotFoundError("Screenplay")
      }
      throw new ForbiddenError(access.error)
    }

    const { filterType, filterValue, title, expiresAt, callsheetId } = data

    if (callsheetId) {
      const { data: callsheet, error: callsheetError } = await supabase
        .from("Callsheet")
        .select("id")
        .eq("id", callsheetId)
        .single()

      if (callsheetError?.code === "PGRST116" || !callsheet) {
        throw new NotFoundError("Callsheet")
      }
      if (callsheetError) handleSupabaseError(callsheetError, "Side")
    }

    // Fetch screenplay title for default title generation
    const { data: screenplay } = await supabase
      .from("Screenplay")
      .select("title")
      .eq("id", id)
      .single()

    const generatedTitle = title || (
      filterType === "character" && filterValue
        ? `${filterValue}'s Sides`
        : filterType === "scenes" && filterValue
        ? `Selected Scenes`
        : `${screenplay?.title || "Screenplay"} - Full Sides`
    )

    const { data: side, error: createError } = await supabase
      .from("DigitalSide")
      .insert({
        screenplayId: id,
        userId: user.id,
        filterType,
        filterValue: filterValue || null,
        title: generatedTitle,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        callsheetId: callsheetId || null,
      })
      .select()
      .single()

    if (createError) handleSupabaseError(createError, "Side")

    return { side }
  },
})
