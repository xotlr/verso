"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Save,
  Download,
  Share2,
  PanelRight,
  MoreHorizontal,
  History,
} from "lucide-react";

import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectHeaderProps {
  projectId: string;
  projectTitle: string;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onHistory?: () => void;
  onToggleRightSidebar?: () => void;
  showRightSidebarToggle?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export function ProjectHeader({
  projectId,
  projectTitle,
  onSave,
  onExport,
  onShare,
  onHistory,
  onToggleRightSidebar,
  showRightSidebarToggle = false,
  isSaving = false,
  hasUnsavedChanges = false,
}: ProjectHeaderProps) {
  const pathname = usePathname();

  // Determine current page based on pathname
  const getCurrentPage = () => {
    if (pathname.includes('/editor/')) return 'Editor';
    if (pathname.includes('/board/')) return 'Beat Board';
    if (pathname.includes('/cards/')) return 'Index Cards';
    if (pathname.includes('/visualization/')) return 'Reports';
    return 'Project';
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      {/* Left side - Sidebar trigger and breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />

        {/* Breadcrumb */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/home">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/editor/${projectId}`}>{projectTitle}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{getCurrentPage()}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile title */}
        <span className="font-medium md:hidden truncate max-w-[150px]">
          {projectTitle}
        </span>
      </div>

      {/* Right side - Actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Save indicator */}
        {hasUnsavedChanges && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Unsaved changes
          </span>
        )}

        {/* Save button */}
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="hidden sm:flex"
          >
            <Save className={cn("h-4 w-4 mr-2", isSaving && "animate-pulse")} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}

        {/* Export button */}
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="hidden sm:flex"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}

        {/* History button */}
        {onHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="hidden sm:flex"
            title="Version history"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSave && (
              <DropdownMenuItem onClick={onSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
            )}
            {onHistory && (
              <DropdownMenuItem onClick={onHistory}>
                <History className="h-4 w-4 mr-2" />
                Version History
              </DropdownMenuItem>
            )}
            {onShare && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right sidebar toggle */}
        {showRightSidebarToggle && onToggleRightSidebar && (
          <>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleRightSidebar}
              className="h-8 w-8"
              title="Toggle sidebar"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export default ProjectHeader;
