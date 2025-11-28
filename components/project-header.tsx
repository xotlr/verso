"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Save,
  Download,
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

interface ProjectHeaderProps {
  projectId: string;
  projectTitle: string;
  onSave?: () => void;
  onExport?: () => void;
  onHistory?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export function ProjectHeader({
  projectId,
  projectTitle,
  onSave,
  onExport,
  onHistory,
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
              {getCurrentPage() === 'Editor' ? (
                <BreadcrumbPage>{projectTitle}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={`/editor/${projectId}`}>{projectTitle}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {getCurrentPage() !== 'Editor' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getCurrentPage()}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
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

      </div>
    </header>
  );
}

export default ProjectHeader;
