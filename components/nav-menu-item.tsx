"use client";

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
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
  icon: LucideIcon;
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
  notification,
  pathname,
  isCollapsed: _isCollapsed,
  index = 0,
  onClick,
}: NavMenuItemProps) {
  const isActive = url ? (pathname === url || pathname.startsWith(`${url}/`)) : false;

  return (
    <SidebarMenuItem
      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
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
                    "w-full px-3 py-1.5 transition-all duration-150 text-sm group/item rounded-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground",
                    "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg",
                    isActive && "group-data-[collapsible=icon]:bg-accent"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="inline-block mr-2 group-data-[collapsible=icon]:mr-0">
                    <Icon className={cn(
                      "h-4 w-4 transition-colors duration-150",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover/item:text-foreground"
                    )} />
                  </div>

                  <span className="font-medium group-data-[collapsible=icon]:sr-only">
                    {title}
                  </span>

                  {notification && (
                    <Badge
                      className="ml-auto h-4 min-w-4 flex items-center justify-center px-1 bg-primary text-primary-foreground text-xs font-semibold group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:min-w-2 group-data-[collapsible=icon]:p-0"
                    >
                      <span className="group-data-[collapsible=icon]:sr-only">
                        {typeof notification === 'number'
                          ? notification > 9
                            ? '9+'
                            : notification
                          : ''}
                      </span>
                    </Badge>
                  )}
                </Link>
              ) : (
                <button
                  onClick={onClick}
                  className={cn(
                    "w-full px-3 py-1.5 transition-all duration-150 text-sm group/item flex items-center rounded-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "hover:bg-accent hover:text-accent-foreground",
                    "text-muted-foreground",
                    "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg"
                  )}
                >
                  <div className="inline-block mr-2 group-data-[collapsible=icon]:mr-0">
                    <Icon className="h-4 w-4 transition-colors duration-150 group-hover/item:text-foreground" />
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
