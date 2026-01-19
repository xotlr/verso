"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/components/providers/auth-provider"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useSafeFetch, useAbortSignal } from "./use-safe-fetch"

export interface Notification {
  id: string
  userId: string
  type: string // schedule_change | callsheet_update | checkin | wrap
  title: string
  body: string | null
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession()
  const getAbortSignal = useAbortSignal()

  // Local state for optimistic updates and realtime additions
  const [localNotifications, setLocalNotifications] = useState<Notification[] | null>(null)
  const [localUnreadCount, setLocalUnreadCount] = useState<number | null>(null)

  // Safe fetch with automatic abort on unmount
  const { data, isLoading, refetch } = useSafeFetch<NotificationsResponse>(
    session?.user?.id ? "/api/notifications?limit=20" : null
  )

  // Use local state if set (optimistic/realtime), otherwise use fetched data
  const notifications = localNotifications ?? data?.notifications ?? []
  const unreadCount = localUnreadCount ?? data?.unreadCount ?? 0

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update first
    const previousNotifications = localNotifications ?? data?.notifications ?? []
    const previousUnreadCount = localUnreadCount ?? data?.unreadCount ?? 0

    setLocalNotifications(
      previousNotifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      )
    )
    setLocalUnreadCount(Math.max(0, previousUnreadCount - 1))

    try {
      const signal = getAbortSignal()
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        signal,
      })

      if (!response.ok) {
        // Rollback optimistic update
        setLocalNotifications(previousNotifications)
        setLocalUnreadCount(previousUnreadCount)

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update notification (${response.status})`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      // Rollback on any error
      setLocalNotifications(previousNotifications)
      setLocalUnreadCount(previousUnreadCount)

      toast.error("Failed to mark notification as read")
    }
  }, [getAbortSignal, data, localNotifications, localUnreadCount])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update first
    const previousNotifications = localNotifications ?? data?.notifications ?? []
    const previousUnreadCount = localUnreadCount ?? data?.unreadCount ?? 0

    setLocalNotifications(
      previousNotifications.map((n) => ({ ...n, isRead: true }))
    )
    setLocalUnreadCount(0)

    try {
      const signal = getAbortSignal()
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        signal,
      })

      if (!response.ok) {
        // Rollback optimistic update
        setLocalNotifications(previousNotifications)
        setLocalUnreadCount(previousUnreadCount)

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update notifications (${response.status})`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      // Rollback on any error
      setLocalNotifications(previousNotifications)
      setLocalUnreadCount(previousUnreadCount)

      toast.error("Failed to mark all as read")
    }
  }, [getAbortSignal, data, localNotifications, localUnreadCount])

  // Reset local state when data changes (after refetch)
  useEffect(() => {
    if (data) {
      setLocalNotifications(null)
      setLocalUnreadCount(null)
    }
  }, [data])

  // Supabase Realtime subscription for new notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase
      .channel(`notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${session.user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification

          // Add to local list (optimistic update)
          setLocalNotifications((prev) => [
            newNotification,
            ...(prev ?? data?.notifications ?? []),
          ])
          setLocalUnreadCount((prev) => (prev ?? data?.unreadCount ?? 0) + 1)

          // Show toast
          toast(newNotification.title, {
            description: newNotification.body || undefined,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, data])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch,
  }
}
