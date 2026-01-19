import { createApiHandler, handleSupabaseError } from "@/lib/api"

type ConnectionRequest = {
  id: string
  createdAt: string
  requester: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    title: string | null
    location: string | null
    bio: string | null
  } | null
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: requests, error } = await supabase
      .from("Connection")
      .select(`
        id, createdAt,
        requester:User!requesterId(id, name, username, image, title, location, bio)
      `)
      .eq("addresseeId", user.id)
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false })

    if (error) handleSupabaseError(error, "Connection")

    return {
      requests: (requests || []).map((req: ConnectionRequest) => ({
        id: req.id,
        createdAt: req.createdAt,
        user: req.requester,
      })),
    }
  },
})
