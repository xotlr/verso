"use client";

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { IconType } from 'react-icons';

import { cn } from '@/lib/utils';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface NavMenuItemProps {
  title: string;
  url?: string;
  icon: LucideIcon | IconType;
  activeIcon?: IconType;  // Optional filled icon for active state
  notification?: number | boolean;
  pathname: string;
  index?: number;
  onClick?: () => void;
  isActive?: boolean;  // Override URL-based active detection
}

export function NavMenuItem({
  title,
  url,
  icon: Icon,
  activeIcon: ActiveIcon,
  notification,
  pathname,
  index = 0,
  onClick,
  isActive: isActiveProp,
}: NavMenuItemProps) {
  const isActive = isActiveProp ?? (url ? (pathname === url || pathname.startsWith(`${url}/`)) : false);

  // For route-active state, always show filled icon if available
  // For pressed state (CSS :active), swap icons via CSS classes
  const showFilledByDefault = isActive && ActiveIcon;

  return (
    <SidebarMenuItem
      className="sidebar-menu-item"
      style={{ '--stagger-delay': `${index * 50}ms` } as React.CSSProperties}
    >
      <SidebarMenuButton asChild tooltip={title}>
        {url ? (
          <Link
            href={url}
            className={cn(
              "transition-colors duration-150 text-sm group/item flex items-center justify-center rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative flex-shrink-0">
              {showFilledByDefault && ActiveIcon ? (
                <ActiveIcon className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover/item:text-foreground"
                )} />
              )}
              {notification && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />
              )}
            </div>
          </Link>
        ) : (
          <button
            onClick={onClick}
            className={cn(
              "transition-colors duration-150 text-sm group/item flex items-center justify-center rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            <div className="relative flex-shrink-0">
              {showFilledByDefault && ActiveIcon ? (
                <ActiveIcon className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover/item:text-foreground"
                )} />
              )}
              {notification && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />
              )}
            </div>
          </button>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
