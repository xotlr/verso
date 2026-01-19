import { z } from "zod"
import { createApiHandler, BadRequestError, NotFoundError } from "@/lib/api"

const createConnectionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  message: z.string().max(500).optional(),
})

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, supabase }) => {
    const { data: connections, error } = await supabase
      .from("Connection")
      .select(`
        id, status, updatedAt,
        requester:User!requesterId(id, name, username, image, title, location),
        addressee:User!addresseeId(id, name, username, image, title, location)
      `)
      .eq("status", "ACCEPTED")
      .or(`requesterId.eq.${user.id},addresseeId.eq.${user.id}`)
      .order("updatedAt", { ascending: false })

    if (error) throw error

    type ConnectionWithUsers = {
      id: string
      status: string
      updatedAt: string
      requesterId: string
      requester: { id: string; name: string | null; username: string | null; image: string | null; title: string | null; location: string | null }
      addressee: { id: string; name: string | null; username: string | null; image: string | null; title: string | null; location: string | null }
    }

    const connectedUsers = (connections || []).map((conn: ConnectionWithUsers) => {
      const otherUser = (conn as any).requester?.id === user.id ? conn.addressee : conn.requester
      return {
        connectionId: conn.id,
        connectedAt: conn.updatedAt,
        user: otherUser,
      }
    })

    return { connections: connectedUsers }
  },
})

export const POST = createApiHandler({
  auth: "required",
  schema: createConnectionSchema,
  handler: async ({ user, data, supabase }) => {
    const { userId: targetUserId } = data
    const requesterId = user.id

    if (requesterId === targetUserId) {
      throw new BadRequestError("Cannot connect to yourself")
    }

    // Check target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from("User")
      .select("id, isPublic")
      .eq("id", targetUserId)
      .single()

    if (targetError?.code === "PGRST116" || !targetUser) {
      throw new NotFoundError("User")
    }
    if (targetError) throw targetError

    // Check for existing connection
    const { data: existingConnections } = await supabase
      .from("Connection")
      .select("*")
      .or(`and(requesterId.eq.${requesterId},addresseeId.eq.${targetUserId}),and(requesterId.eq.${targetUserId},addresseeId.eq.${requesterId})`)

    const existingConnection = existingConnections?.[0]

    if (existingConnection) {
      if (existingConnection.status === "ACCEPTED") {
        throw new BadRequestError("Already connected")
      }
      if (existingConnection.status === "PENDING") {
        if (existingConnection.requesterId === targetUserId) {
          const { data: updated, error: updateError } = await supabase
            .from("Connection")
            .update({ status: "ACCEPTED" })
            .eq("id", existingConnection.id)
            .select()
            .single()

          if (updateError) throw updateError
          return { connection: updated, message: "Connection request accepted" }
        }
        throw new BadRequestError("Connection request already sent")
      }
      if (existingConnection.status === "DECLINED") {
        const declinedAt = new Date(existingConnection.updatedAt)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        if (declinedAt > sevenDaysAgo) {
          throw new BadRequestError("Cannot send request again yet. Please wait a few days.")
        }

        await supabase.from("Connection").delete().eq("id", existingConnection.id)
      }
    }

    // Create new connection request
    const { data: connection, error: createError } = await supabase
      .from("Connection")
      .insert({
        requesterId,
        addresseeId: targetUserId,
        status: "PENDING",
      })
      .select()
      .single()

    if (createError) throw createError

    return { connection }
  },
})
