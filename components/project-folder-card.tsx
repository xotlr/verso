'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreHorizontal,
  Trash2,
  Settings,
  FilePlus,
  FolderInput,
  Pencil,
} from 'lucide-react';
import { RiFolder6Line } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';

interface ProjectRole {
  id?: string;
  role: string;
  name: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ScreenplayPreview {
  id: string;
  title: string;
}

export interface ProjectFolderCardData {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string;
  roles?: ProjectRole[];
  screenplays?: ScreenplayPreview[];
  _count?: {
    screenplays: number;
    notes: number;
  };
}

interface ProjectFolderCardProps {
  project: ProjectFolderCardData;
  href?: string;
  // READ
  onOpen?: () => void;
  // CREATE
  onNewScreenplay?: () => void;
  onAddExistingScreenplay?: () => void;
  // UPDATE
  onRename?: () => void;
  onSettings?: () => void;
  // DELETE
  onDelete?: () => void;
}

export function ProjectFolderCard({
  project,
  href,
  onDelete,
  onOpen,
  onNewScreenplay,
  onAddExistingScreenplay,
  onRename,
  onSettings,
}: ProjectFolderCardProps) {
  const linkHref = href || `/project/${project.id}`;
  const screenplayCount = project._count?.screenplays || project.screenplays?.length || 0;
  const hasContent = screenplayCount > 0;

  // Get preview screenplays (up to 3)
  const previewScreenplays = project.screenplays?.slice(0, 3) || [];

  // Get unique people from all roles (regardless of role type)
  const uniquePeople = React.useMemo(() => {
    if (!project.roles) return [];
    const peopleMap = new Map<string, ProjectRole>();
    project.roles.forEach(role => {
      if (role.name && !peopleMap.has(role.name)) {
        peopleMap.set(role.name, role);
      }
    });
    return Array.from(peopleMap.values());
  }, [project.roles]);

  return (
    <div
      className={cn(
        'group',
        'transition-all duration-300 ease-out',
        'touch-manipulation'
      )}
    >
      {/* 3D Folder Container */}
      <div className="relative w-full min-h-[180px] sm:min-h-[200px] transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.02]">

        {/* Back Tab (Top Left) - Simple rectangle */}
        <div className={cn(
          "absolute top-0 left-0 w-[45%] xs:w-[42%] sm:w-[38%] h-[28px] xs:h-[30px] sm:h-[34px] md:h-[38px] lg:h-[42px] z-0",
          "rounded-t-lg",
          "transition-all duration-500 shadow-sm",
          hasContent
            ? "bg-primary/20 group-hover:bg-primary/30"
            : "bg-primary/10 group-hover:bg-primary/20"
        )}
        />

        {/* Screenplay Cards Peeking Out */}
        <div className="absolute inset-x-3 xs:inset-x-4 sm:inset-x-6 top-[28px] xs:top-[30px] sm:top-[34px] md:top-[38px] bottom-[80px] xs:bottom-[85px] sm:bottom-[90px] md:bottom-[95px] z-[5] transition-all duration-500 pointer-events-none">
          {previewScreenplays.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-3/4 border-2 border-dashed border-border/15 rounded-md opacity-50" />
            </div>
          )}

          {previewScreenplays.map((screenplay, i) => {
            // Calculate organic rotation and spread with natural variation
            const indexOffset = i - (previewScreenplays.length - 1) / 2;

            // Add deterministic "randomness" based on screenplay ID for organic look
            const seed = screenplay.id.charCodeAt(0) % 10;
            const rotationVariance = (seed % 3) - 1; // -1, 0, or 1
            const verticalVariance = (seed % 5) * 2; // 0, 2, 4, 6, or 8 pixels

            const rotate = indexOffset * 4 + rotationVariance * 2; // More organic rotation
            const xOffset = indexOffset * 12; // Slightly tighter horizontal spread

            return (
              <div
                key={screenplay.id}
                // WRAPPER: Handles Static Position & Rotation - z-index increases on hover
                className="absolute bottom-0 w-[42%] xs:w-[40%] sm:w-[42%] transition-all duration-500 ease-out origin-bottom group-hover:z-[15]"
                style={{
                  left: '50%',
                  transform: `translateX(calc(-50% + ${xOffset}px)) rotate(${rotate}deg)`,
                  zIndex: 5 + i, // Above back tab (z-0) but below front face (z-10) normally
                  bottom: `calc(-96% + ${verticalVariance}px)`, // Slight vertical stagger for natural look
                  aspectRatio: '0.9' // Slightly shorter than original, not too much
                }}
              >
                {/* INNER: Handles Hover Animation (Peeking Up) */}
                <div
                  className={cn(
                    "w-full h-full bg-muted group-hover:bg-card rounded-md shadow-md border border-border/30",
                    "flex flex-col p-1.5 xs:p-2 sm:p-2.5 transition-all duration-500 ease-out",
                    "group-hover:-translate-y-[12%] group-hover:border-primary/40 group-hover:shadow-lg",
                    "ring-1 ring-border/20 group-hover:ring-primary/30"
                  )}
                  style={{
                    zIndex: 'inherit'
                  }}
                >

                  {/* Script Title - BARELY visible by default, visible on hover */}
                  <div className="mb-2 text-center">
                    <div className="text-[9px] font-semibold text-foreground/90 uppercase truncate tracking-wide font-['Courier_Prime'] opacity-[0.02] group-hover:opacity-100 transition-opacity duration-500">
                      {screenplay.title}
                    </div>
                  </div>

                  {/* Script-like Content Simulation */}
                  <div className="flex-1 space-y-1.5 overflow-hidden opacity-40 group-hover:opacity-70 transition-opacity duration-500">
                    {/* Scene heading style */}
                    <div className="h-1.5 bg-foreground/70 rounded w-3/4" />
                    {/* Action lines */}
                    <div className="h-1 bg-muted-foreground/30 rounded w-full" />
                    <div className="h-1 bg-muted-foreground/30 rounded w-5/6" />
                    {/* Character name (centered) */}
                    <div className="flex justify-center pt-1">
                      <div className="h-1.5 bg-muted-foreground/40 rounded w-1/3" />
                    </div>
                    {/* Dialogue (indented) */}
                    <div className="pl-3 space-y-1">
                      <div className="h-1 bg-muted-foreground/25 rounded w-2/3" />
                      <div className="h-1 bg-muted-foreground/25 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Front Pocket (The main folder face) - Now Clickable */}
        <Link
          href={linkHref}
          aria-label={`Open project: ${project.name}`}
          className={cn(
            "absolute bottom-0 inset-x-0 top-[26px] xs:top-[28px] sm:top-[32px] md:top-[36px] rounded-lg shadow-lg z-10",
            "flex flex-col items-center justify-center transition-all duration-500 ease-out",
            "border border-border/70 overflow-hidden",
            hasContent
              ? "bg-card group-hover:border-primary/50"
              : "bg-muted/40 group-hover:bg-muted/50"
          )}
        >
          {/* Film Strip Pattern Decorative */}
          <div className="absolute bottom-0 inset-x-0 h-5 bg-muted/20 flex gap-1 justify-center items-center px-1 border-t border-border/20 backdrop-blur-sm z-20">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-2.5 w-4 bg-muted-foreground/10 rounded-[1px] group-hover:bg-muted-foreground/20 transition-colors duration-500" />
            ))}
          </div>

          {/* Label Tag */}
          <div className={cn(
            "absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-semibold border shadow-sm uppercase tracking-wide transition-all duration-500 z-20",
            hasContent
              ? "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30"
              : "bg-muted/60 text-muted-foreground/70 border-border/30 group-hover:bg-muted/70"
          )}>
            {hasContent ? 'ACTIVE' : 'EMPTY'}
          </div>

          {/* Menu Button - Positioned on folder face */}
          {(onDelete || onOpen || onNewScreenplay || onAddExistingScreenplay || onRename || onSettings) && (
            <div
              className="absolute top-3 right-2 z-30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "p-2 rounded-md transition-colors duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center",
                      "hover:bg-accent",
                      "opacity-100",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      "active:scale-95"
                    )}
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {onOpen && (
                    <DropdownMenuItem onClick={onOpen}>
                      <RiFolder6Line className="mr-2 h-4 w-4" />
                      Open Project
                    </DropdownMenuItem>
                  )}
                  {(onNewScreenplay || onAddExistingScreenplay) && onOpen && (
                    <DropdownMenuSeparator />
                  )}
                  {onNewScreenplay && (
                    <DropdownMenuItem onClick={onNewScreenplay}>
                      <FilePlus className="mr-2 h-4 w-4" />
                      New Screenplay
                    </DropdownMenuItem>
                  )}
                  {onAddExistingScreenplay && (
                    <DropdownMenuItem onClick={onAddExistingScreenplay}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Add Existing Screenplay
                    </DropdownMenuItem>
                  )}
                  {(onRename || onSettings) && (
                    <DropdownMenuSeparator />
                  )}
                  {onRename && (
                    <DropdownMenuItem onClick={onRename}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename Project
                    </DropdownMenuItem>
                  )}
                  {onSettings && (
                    <DropdownMenuItem onClick={onSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      Project Settings
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Info Overlay - Inside Folder at Bottom */}
          <div className="absolute bottom-0 inset-x-0 z-30 p-3 pb-7 sm:p-4 sm:pb-8">
            {/* Title */}
            <h3 className="text-sm font-semibold uppercase tracking-normal text-foreground/95 mb-2 line-clamp-1 group-hover:underline group-hover:text-primary decoration-muted-foreground/50 underline-offset-4 transition-all duration-500 font-mono">
              {project.name}
            </h3>

            {/* Script Count Badge */}
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs rounded-md transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
              </Badge>
            </div>

            {/* Footer - Avatars & Timestamp */}
            <div className="flex items-center justify-between gap-2">
              {/* Avatar Group */}
              {uniquePeople.length > 0 && (
                <div className="flex -space-x-2">
                  {uniquePeople.slice(0, 3).map((person, i) => (
                    <Avatar
                      key={person.id || i}
                      className="w-6 h-6 rounded-lg border-2 border-background ring-1 ring-border/40 transition-all duration-300 hover:scale-110 hover:z-10"
                    >
                      <AvatarImage src={person.user?.image || undefined} alt={person.name || "User"} />
                      <AvatarFallback
                        className="rounded-lg text-white font-medium text-[10px]"
                        style={person.userId ? getSimpleGradientStyle(person.userId) : undefined}
                      >
                        {person.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {uniquePeople.length > 3 && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-muted border-2 border-background text-[10px] font-semibold text-muted-foreground/90 ring-1 ring-border/40">
                      +{uniquePeople.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground transition-all duration-500">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// Skeleton loader for the folder card
export function ProjectFolderCardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 3D Folder Skeleton */}
      <div className="relative w-full min-h-[180px] sm:min-h-[200px]">
        {/* Back Tab */}
        <div className="absolute top-0 left-0 w-[45%] xs:w-[42%] sm:w-[38%] h-[16px] xs:h-[18px] sm:h-[20px] rounded-t-md bg-muted/50" />

        {/* Back Plate */}
        <div className="absolute top-[14px] sm:top-[16px] inset-x-0 bottom-0 rounded-lg bg-muted/50" />

        {/* Front Face */}
        <div className="absolute bottom-0 inset-x-0 top-[14px] sm:top-[16px] rounded-lg bg-card border border-border shadow-lg flex items-center justify-center">
          {/* Icon placeholder */}
          <div className="h-10 w-10 bg-muted-foreground/10 rounded-md" />

          {/* Info Overlay Skeleton */}
          <div className="absolute bottom-0 inset-x-0 p-3 space-y-2">
            {/* Title */}
            <div className="h-4 w-32 bg-muted/60 rounded" />

            {/* Badges */}
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-16 bg-muted/50 rounded-md" />
              <div className="h-5 w-20 bg-muted/40 rounded-md" />
            </div>

            {/* Timestamp */}
            <div className="h-3 w-24 bg-muted/40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
