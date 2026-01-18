"use client"

import { Bell } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationPanel } from "./notification-panel"
import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mobile"

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications()
  const mounted = useMounted()

  // Render placeholder during SSR to avoid hydration mismatch from Radix IDs
  if (!mounted) {
    return (
      <button
        data-header-button=""
        className={cn(
          "relative flex items-center justify-center rounded-lg p-2 text-sm outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "active:scale-[0.98]",
          "[&_svg]:text-muted-foreground [&_svg]:hover:text-foreground",
          "size-8"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-header-button=""
          className={cn(
            "relative flex items-center justify-center rounded-lg p-2 text-sm outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "active:scale-[0.98]",
            "[&_svg]:text-muted-foreground [&_svg]:hover:text-foreground",
            "size-8"
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 rounded-full",
                "bg-foreground text-background text-[10px] font-medium tabular-nums"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      </PopoverContent>
    </Popover>
  )
}
