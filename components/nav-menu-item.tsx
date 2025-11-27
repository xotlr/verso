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
  url: string;
  icon: LucideIcon;
  notification?: number | boolean;
  pathname: string;
  isCollapsed: boolean;
  index?: number;
}

export function NavMenuItem({
  title,
  url,
  icon: Icon,
  notification,
  pathname,
  isCollapsed,
  index = 0,
}: NavMenuItemProps) {
  const isActive = pathname === url || pathname.startsWith(`${url}/`);

  return (
    <SidebarMenuItem
      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
      style={{ '--stagger-delay': `${index * 50}ms` } as React.CSSProperties}
    >
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton asChild>
              <Link
                href={url}
                className={cn(
                  "w-full px-3 py-1.5 transition-all duration-150 text-sm group/item",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                  !isCollapsed && "hover:border-l-[3px] hover:border-primary",
                  isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-foreground/80",
                  isActive && !isCollapsed && "border border-primary/30 border-l-[3px] border-l-primary",
                  "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg",
                  isActive &&
                    "group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:ring-2 group-data-[collapsible=icon]:ring-primary/50 group-data-[collapsible=icon]:bg-primary/10"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative inline-block mr-2 group-data-[collapsible=icon]:mr-0">
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-primary/50 blur-sm" />
                  )}
                  <Icon className="relative h-4 w-4 transition-all duration-200 group-hover/item:text-primary" />
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
