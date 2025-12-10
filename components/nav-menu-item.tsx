"use client";

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { IconType } from 'react-icons';

import { cn } from '@/lib/utils';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface NavMenuItemProps {
  title: string;
  url?: string;
  icon: LucideIcon | IconType;
  activeIcon?: IconType;  // Optional filled icon for active state
  notification?: number | boolean;
  pathname: string;
  isCollapsed: boolean;
  index?: number;
  onClick?: () => void;
}

export function NavMenuItem({
  title,
  url,
  icon: Icon,
  activeIcon: ActiveIcon,
  notification,
  pathname,
  isCollapsed: _isCollapsed,
  index = 0,
  onClick,
}: NavMenuItemProps) {
  const isActive = url ? (pathname === url || pathname.startsWith(`${url}/`)) : false;

  // Use active icon if provided and item is active, otherwise use default icon
  const CurrentIcon = (isActive && ActiveIcon) ? ActiveIcon : Icon;

  return (
    <SidebarMenuItem
      style={{ '--stagger-delay': `${index * 50}ms` } as React.CSSProperties}
    >
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild>
              {url ? (
                <Link
                  href={url}
                  className={cn(
                    "px-3 py-1.5 transition-all duration-150 text-sm group/item flex items-center rounded-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="relative mr-2 group-data-[collapsible=icon]:mr-0 flex-shrink-0">
                    <CurrentIcon className={cn(
                      "h-4 w-4 transition-colors duration-150",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover/item:text-foreground"
                    )} />
                    {notification && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />
                    )}
                  </div>

                  <span className="font-medium group-data-[collapsible=icon]:sr-only">
                    {title}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={onClick}
                  className={cn(
                    "px-3 py-1.5 transition-all duration-150 text-sm group/item flex items-center rounded-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
                    "text-muted-foreground"
                  )}
                >
                  <div className="relative mr-2 group-data-[collapsible=icon]:mr-0 flex-shrink-0">
                    <CurrentIcon className="h-4 w-4 transition-colors duration-150 group-hover/item:text-foreground" />
                    {notification && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full" />
                    )}
                  </div>

                  <span className="font-medium group-data-[collapsible=icon]:sr-only">
                    {title}
                  </span>
                </button>
              )}
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right" className="group-data-[state=expanded]:hidden">
            {title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </SidebarMenuItem>
  );
}
