import { createApiHandler } from "@/lib/api"

export type ConnectionStatusResponse = {
  status: "none" | "pending_sent" | "pending_received" | "connected"
  connectionId: string | null
}

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params, supabase }) => {
    const { userId: targetUserId } = params
    const currentUserId = user.id

    if (currentUserId === targetUserId) {
      return { status: "none", connectionId: null } as ConnectionStatusResponse
    }

    const { data: connection } = await supabase
      .from("Connection")
      .select("id, status, requesterId")
      .or(
        `and(requesterId.eq.${currentUserId},addresseeId.eq.${targetUserId}),and(requesterId.eq.${targetUserId},addresseeId.eq.${currentUserId})`
      )
      .single()

    if (!connection) {
      return { status: "none", connectionId: null } as ConnectionStatusResponse
    }

    let status: ConnectionStatusResponse["status"]

    if (connection.status === "ACCEPTED") {
      status = "connected"
    } else if (connection.status === "PENDING") {
      status = connection.requesterId === currentUserId ? "pending_sent" : "pending_received"
    } else {
      status = "none"
    }

    return { status, connectionId: connection.id } as ConnectionStatusResponse
  },
})
