'use client';

import React, { CSSProperties } from 'react';
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

// ============================================================================
// CONSTANTS - All magic numbers in one place
// ============================================================================

const FOLDER = {
  // Tab dimensions (px)
  tab: {
    width: { base: 45, xs: 42, sm: 38 }, // percentage
    height: { base: 28, xs: 30, sm: 34, md: 38 },
  },
  // Front face offset from top (px) - slightly less than tab for overlap illusion
  frontTop: { base: 26, xs: 28, sm: 32, md: 36 },
  // Card minimum height (px)
  minHeight: { base: 180, sm: 200 },
  // Screenplay peek settings
  peek: {
    revealPercent: 4, // % of card visible above folder
    maxRotation: 4,   // degrees
    spread: 12,       // px between cards
  },
} as const;

// Premium shadow system - layered for depth
const SHADOWS = {
  card: [
    '0_1px_2px_rgba(0,0,0,0.04)',
    '0_4px_8px_rgba(0,0,0,0.04)',
    '0_8px_16px_rgba(0,0,0,0.04)',
  ].join(','),
  cardHover: [
    '0_4px_8px_rgba(0,0,0,0.06)',
    '0_12px_24px_rgba(0,0,0,0.06)',
    '0_20px_40px_rgba(0,0,0,0.04)',
  ].join(','),
  cardDark: [
    '0_1px_2px_rgba(0,0,0,0.2)',
    '0_4px_8px_rgba(0,0,0,0.15)',
    '0_8px_16px_rgba(0,0,0,0.1)',
  ].join(','),
  cardHoverDark: [
    '0_4px_8px_rgba(0,0,0,0.3)',
    '0_12px_24px_rgba(0,0,0,0.25)',
    '0_20px_40px_rgba(0,0,0,0.2)',
  ].join(','),
  script: '0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)',
  scriptHover: '0_8px_16px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.06)',
} as const;

// Spring easing for playful animations
const EASE_SPRING = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate position/rotation for a screenplay card peeking out of the folder
 */
function calculateScreenplayPosition(
  index: number,
  total: number,
  id: string
): CSSProperties {
  const indexOffset = index - (total - 1) / 2;

  // Deterministic "randomness" based on ID for organic look
  const seed = id.charCodeAt(0) % 10;
  const rotationVariance = (seed % 3) - 1; // -1, 0, or 1
  const verticalVariance = (seed % 5) * 2; // 0, 2, 4, 6, or 8 pixels

  const rotate = indexOffset * FOLDER.peek.maxRotation + rotationVariance * 2;
  const xOffset = indexOffset * FOLDER.peek.spread;

  return {
    left: '50%',
    transform: `translateX(calc(-50% + ${xOffset}px)) rotate(${rotate}deg)`,
    zIndex: index,
    bottom: `calc(-${100 - FOLDER.peek.revealPercent}% + ${verticalVariance}px)`,
    aspectRatio: '0.9',
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FilmStripProps {
  count: number;
}

function FilmStrip({ count }: FilmStripProps) {
  // Show strips proportional to content (min 3, max 8)
  const stripCount = Math.max(3, Math.min(count || 0, 8));

  return (
    <div className="absolute bottom-0 inset-x-0 h-5 bg-muted/20 flex gap-1 justify-center items-center px-1 border-t border-border/20 backdrop-blur-sm">
      {Array.from({ length: stripCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-2.5 w-4 rounded-[1px] transition-all duration-300',
            i < count
              ? 'bg-primary/20 group-hover:bg-primary/30'
              : 'bg-muted-foreground/10 group-hover:bg-muted-foreground/20'
          )}
          style={{ transitionDelay: `${i * 20}ms` }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================

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
  onOpen?: () => void;
  onNewScreenplay?: () => void;
  onAddExistingScreenplay?: () => void;
  onRename?: () => void;
  onSettings?: () => void;
  onDelete?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const hasActions = onDelete || onOpen || onNewScreenplay || onAddExistingScreenplay || onRename || onSettings;

  // Memoize preview screenplays and their positions
  const previewScreenplays = React.useMemo(
    () => project.screenplays?.slice(0, 3) || [],
    [project.screenplays]
  );

  const screenplayPositions = React.useMemo(
    () => previewScreenplays.map((s, i) => calculateScreenplayPosition(i, previewScreenplays.length, s.id)),
    [previewScreenplays]
  );

  // Get unique people from roles
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
    <div className="group touch-manipulation">
      {/* 3D Folder Container */}
      <div
        className={cn(
          'relative w-full min-h-[180px] sm:min-h-[200px]',
          'transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-[1.01]'
        )}
        style={{ transitionTimingFunction: EASE_SPRING }}
      >
        {/* Back Tab (Top Left) */}
        <div
          className={cn(
            'absolute top-0 left-0 rounded-t-lg',
            'w-[45%] xs:w-[42%] sm:w-[38%]',
            'h-[28px] xs:h-[30px] sm:h-[34px] md:h-[38px]',
            'transition-all duration-500',
            'shadow-[0_1px_3px_rgba(0,0,0,0.06)] group-hover:shadow-md',
            hasContent
              ? 'bg-primary/20 group-hover:bg-primary/30'
              : 'bg-primary/10 group-hover:bg-primary/20'
          )}
        />

        {/* Back Plate - fills space behind screenplay cards */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 rounded-lg',
            'top-[26px] xs:top-[28px] sm:top-[32px] md:top-[36px]',
            'transition-all duration-500',
            hasContent
              ? 'bg-primary/15 group-hover:bg-primary/20'
              : 'bg-primary/[0.08] group-hover:bg-primary/[0.12]'
          )}
        />

        {/* Screenplay Cards Peeking Out */}
        <div
          className={cn(
            'absolute inset-x-3 xs:inset-x-4 sm:inset-x-6 pointer-events-none',
            'top-[28px] xs:top-[30px] sm:top-[34px] md:top-[38px]',
            'bottom-[80px] xs:bottom-[85px] sm:bottom-[90px] md:bottom-[95px]'
          )}
        >
          {previewScreenplays.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-3/4 border-2 border-dashed border-border/15 rounded-md opacity-50" />
            </div>
          )}

          {previewScreenplays.map((screenplay, i) => (
            <div
              key={screenplay.id}
              className="absolute bottom-0 w-[42%] xs:w-[40%] sm:w-[42%] origin-bottom"
              style={screenplayPositions[i]}
            >
              <div
                className={cn(
                  'w-full h-full rounded-md border border-border/30',
                  'flex flex-col p-1.5 xs:p-2 sm:p-2.5',
                  'bg-muted group-hover:bg-card',
                  'ring-1 ring-border/20 group-hover:ring-primary/30',
                  'group-hover:-translate-y-[12%] group-hover:border-primary/40',
                  'transition-all duration-500'
                )}
                style={{
                  transitionTimingFunction: EASE_SPRING,
                  transitionDelay: `${i * 50}ms`,
                  boxShadow: `${SHADOWS.script}`,
                }}
              >
                {/* Script Title */}
                <div className="mb-2 text-center">
                  <div className="text-[9px] font-semibold text-foreground/90 uppercase truncate tracking-wide font-['Courier_Prime'] opacity-[0.02] group-hover:opacity-100 transition-opacity duration-500">
                    {screenplay.title}
                  </div>
                </div>

                {/* Script-like Content Simulation */}
                <div className="flex-1 space-y-1.5 overflow-hidden opacity-40 group-hover:opacity-70 transition-opacity duration-500">
                  <div className="h-1.5 bg-foreground/70 rounded w-3/4" />
                  <div className="h-1 bg-muted-foreground/30 rounded w-full" />
                  <div className="h-1 bg-muted-foreground/30 rounded w-5/6" />
                  <div className="flex justify-center pt-1">
                    <div className="h-1.5 bg-muted-foreground/40 rounded w-1/3" />
                  </div>
                  <div className="pl-3 space-y-1">
                    <div className="h-1 bg-muted-foreground/25 rounded w-2/3" />
                    <div className="h-1 bg-muted-foreground/25 rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Front Face (Main folder pocket) */}
        <Link
          href={linkHref}
          aria-label={`Open project: ${project.name}${project.description ? ` - ${project.description}` : ''}`}
          className={cn(
            'absolute bottom-0 inset-x-0 rounded-lg overflow-hidden',
            'top-[26px] xs:top-[28px] sm:top-[32px] md:top-[36px]',
            'flex flex-col items-center justify-center',
            'border border-border/70 group-hover:border-primary/50',
            'transition-all duration-500',
            hasContent ? 'bg-card' : 'bg-muted/40 group-hover:bg-muted/50'
          )}
          style={{
            boxShadow: `${SHADOWS.card}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = SHADOWS.cardHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = SHADOWS.card;
          }}
        >
          {/* Hover glow effect */}
          <div className="absolute -inset-[1px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

          {/* Film Strip */}
          <FilmStrip count={screenplayCount} />

          {/* Status Badge - Enhanced with count */}
          <div
            className={cn(
              'absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wide',
              'transition-all duration-300 group-hover:-translate-y-0.5',
              hasContent
                ? 'bg-primary/10 text-primary border-primary/20 shadow-sm group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:shadow-md'
                : 'bg-muted/60 text-muted-foreground/70 border-border/30 group-hover:bg-muted/70'
            )}
          >
            {hasContent ? `${screenplayCount} SCRIPT${screenplayCount !== 1 ? 'S' : ''}` : 'EMPTY'}
          </div>

          {/* Menu Button */}
          {hasActions && (
            <div
              className="absolute top-3 right-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'p-2 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center',
                      'transition-colors duration-300 hover:bg-accent active:scale-95',
                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                    )}
                    aria-label={`More options for ${project.name}`}
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

          {/* Info Overlay */}
          <div className="absolute bottom-0 inset-x-0 p-3 pb-7 sm:p-4 sm:pb-8">
            {/* Title */}
            <h3 className="text-sm font-semibold uppercase tracking-normal text-foreground/95 line-clamp-1 group-hover:underline group-hover:text-primary decoration-primary/30 decoration-2 underline-offset-4 transition-all duration-300 font-mono">
              {project.name}
            </h3>

            {/* Description - NEW */}
            {project.description && (
              <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1 mb-2">
                {project.description}
              </p>
            )}

            {/* Script Count Badge */}
            {!project.description && (
              <div className="mb-2 mt-2">
                <Badge variant="secondary" className="text-xs rounded-md transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                  {screenplayCount} {screenplayCount === 1 ? 'script' : 'scripts'}
                </Badge>
              </div>
            )}

            {/* Footer - Avatars & Timestamp */}
            <div className="flex items-center justify-between gap-2 mt-2">
              {/* Avatar Group */}
              {uniquePeople.length > 0 && (
                <div className="flex -space-x-2">
                  {uniquePeople.slice(0, 3).map((person, i) => (
                    <Avatar
                      key={person.id || i}
                      className={cn(
                        'w-6 h-6 rounded-md border-2 border-background ring-1 ring-border/40',
                        'transition-all duration-300 hover:scale-110 hover:z-10 hover:ring-2 hover:ring-primary/40'
                      )}
                      style={{ transitionDelay: `${i * 30}ms` }}
                    >
                      <AvatarImage src={person.user?.image || undefined} alt={person.name || 'User'} />
                      <AvatarFallback
                        className="rounded-md text-white font-medium text-[10px]"
                        style={person.userId ? getSimpleGradientStyle(person.userId) : undefined}
                      >
                        {person.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {uniquePeople.length > 3 && (
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted border-2 border-background text-[10px] font-semibold text-muted-foreground/90 ring-1 ring-border/40">
                      +{uniquePeople.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
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

// ============================================================================
// SKELETON
// ============================================================================

export function ProjectFolderCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative w-full min-h-[180px] sm:min-h-[200px]">
        {/* Back Tab */}
        <div className="absolute top-0 left-0 w-[40%] h-[20px] rounded-t-md bg-muted/50" />

        {/* Front Face */}
        <div className="absolute bottom-0 inset-x-0 top-[18px] rounded-lg bg-card border border-border shadow-lg">
          {/* Info Overlay Skeleton */}
          <div className="absolute bottom-0 inset-x-0 p-3 space-y-2">
            <div className="h-4 w-32 bg-muted/60 rounded" />
            <div className="h-3 w-48 bg-muted/40 rounded" />
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-md bg-muted/50" />
                <div className="h-6 w-6 rounded-md bg-muted/50" />
              </div>
              <div className="h-3 w-24 bg-muted/40 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
