"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

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

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/notifications?limit=20")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Supabase Realtime subscription
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

          // Add to list
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

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
  }, [session?.user?.id])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
