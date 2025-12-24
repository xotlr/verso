"use client"

import { formatDistanceToNow } from "date-fns"
import { CheckCheck, Calendar, Users, Film, Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Notification } from "@/hooks/use-notifications"

interface NotificationPanelProps {
  notifications: Notification[]
  isLoading: boolean
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
}

const TYPE_ICONS: Record<string, typeof Calendar> = {
  schedule_change: Calendar,
  callsheet_update: Clapperboard,
  checkin: Users,
  wrap: Film,
}

export function NotificationPanel({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const hasUnread = notifications.some((n) => !n.isRead)

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="text-2xl mb-2">○</div>
        <p className="text-sm">No notifications</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <span className="text-sm font-medium">Notifications</span>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="max-h-80">
        <div className="divide-y divide-border/50">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<void>
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] || Calendar

  return (
    <button
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors",
        "hover:bg-muted/50",
        !notification.isRead && "bg-muted/30"
      )}
      onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0",
          "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !notification.isRead && "font-medium"
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-foreground flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  )
}
