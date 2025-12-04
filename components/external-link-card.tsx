'use client';

/**
 * ExternalLinkCard
 *
 * A preview card for external links with enhanced embed support
 * for YouTube, Pinterest, ShotDeck, Google Docs, Canva, and Vimeo.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Tag,
  Play,
  FileText,
  Table2,
  Presentation,
  StickyNote,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import type { EmbedType } from '@/lib/embed-utils';

export interface ExternalLinkData {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
  siteName: string | null;
  category: string | null;
  createdAt: string;
  // Enhanced embed fields
  embedType?: EmbedType | null;
  embedId?: string | null;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  isPlayable?: boolean;
  notes?: string | null;
}

interface ExternalLinkCardProps {
  link: ExternalLinkData;
  onDelete?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onCategoryChange?: (id: string, category: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  script: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  research: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  reference: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const categoryLabels: Record<string, string> = {
  script: 'Script',
  research: 'Research',
  reference: 'Reference',
  other: 'Other',
};

// Platform badge colors
const embedBadgeColors: Partial<Record<EmbedType, string>> = {
  youtube: 'bg-red-600 text-white',
  vimeo: 'bg-[#1ab7ea] text-white',
  pinterest: 'bg-[#e60023] text-white',
  'google-docs': 'bg-[#4285f4] text-white',
  'google-sheets': 'bg-[#0f9d58] text-white',
  'google-slides': 'bg-[#f4b400] text-black',
  canva: 'bg-[#00c4cc] text-white',
  shotdeck: 'bg-gray-800 text-white',
};

const embedLabels: Partial<Record<EmbedType, string>> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  pinterest: 'Pinterest',
  'google-docs': 'Docs',
  'google-sheets': 'Sheets',
  'google-slides': 'Slides',
  canva: 'Canva',
  shotdeck: 'ShotDeck',
};

// Google doc icons by type
function GoogleDocIcon({ type, className }: { type: EmbedType; className?: string }) {
  switch (type) {
    case 'google-docs':
      return <FileText className={className} />;
    case 'google-sheets':
      return <Table2 className={className} />;
    case 'google-slides':
      return <Presentation className={className} />;
    default:
      return <FileText className={className} />;
  }
}

// YouTube thumbnail with play button overlay
function YouTubeThumbnail({
  thumbnailUrl,
  title,
  onPlay,
}: {
  thumbnailUrl: string;
  title: string;
  onPlay: () => void;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        <Play className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPlay();
      }}
      className="relative aspect-video w-full overflow-hidden group/thumb cursor-pointer"
    >
      <img
        src={thumbnailUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
        onError={() => setError(true)}
      />
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/thumb:bg-black/40 transition-colors">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
      </div>
      {/* YouTube logo badge */}
      <div className="absolute bottom-2 right-2">
        <Badge className={cn('text-xs', embedBadgeColors.youtube)}>
          YouTube
        </Badge>
      </div>
    </button>
  );
}

// Video player modal
function EmbedPlayerModal({
  open,
  onClose,
  embedUrl,
  title,
  embedType,
}: {
  open: boolean;
  onClose: () => void;
  embedUrl: string;
  title: string;
  embedType: EmbedType;
}) {
  // Add autoplay for YouTube
  const playerUrl = embedType === 'youtube'
    ? `${embedUrl}?autoplay=1&rel=0`
    : embedType === 'vimeo'
    ? `${embedUrl}?autoplay=1`
    : embedUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="aspect-video">
            <iframe
              src={playerUrl}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Google Docs preview variant
function GoogleDocsPreview({ link }: { link: ExternalLinkData }) {
  const docType = link.embedType as 'google-docs' | 'google-sheets' | 'google-slides';

  const bgColors = {
    'google-docs': 'from-blue-500/20 to-blue-600/30',
    'google-sheets': 'from-green-500/20 to-green-600/30',
    'google-slides': 'from-yellow-500/20 to-orange-500/30',
  };

  return (
    <div className={cn(
      'relative h-32 bg-gradient-to-br flex items-center justify-center',
      bgColors[docType]
    )}>
      <GoogleDocIcon type={docType} className="w-16 h-16 text-foreground/30" />
      <div className="absolute bottom-2 right-2">
        <Badge className={cn('text-xs', embedBadgeColors[docType])}>
          {embedLabels[docType]}
        </Badge>
      </div>
    </div>
  );
}

// Notes editor popover
function NotesEditor({
  notes,
  onSave,
  hasNotes,
}: {
  notes: string;
  onSave: (notes: string) => void;
  hasNotes: boolean;
}) {
  const [value, setValue] = useState(notes);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reset value when notes prop changes
  useEffect(() => {
    setValue(notes);
  }, [notes]);

  // Debounced auto-save
  const debouncedSave = useCallback((newValue: string) => {
    setSaving(true);
    setSaved(false);
    const timeout = setTimeout(() => {
      onSave(newValue);
      setSaving(false);
      setSaved(true);
      // Clear saved indicator after 2s
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [onSave]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            hasNotes ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <StickyNote className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Notes</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {saving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saved && !saving && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              )}
            </div>
          </div>
          <Textarea
            placeholder="Add notes about this resource..."
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="min-h-[120px] resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Notes auto-save as you type
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ExternalLinkCard({
  link,
  onDelete,
  onRefresh,
  onCategoryChange,
  onNotesChange,
  className,
}: ExternalLinkCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);

  const displayTitle = link.title || link.siteName || new URL(link.url).hostname;
  const category = link.category || 'other';
  const embedType = link.embedType as EmbedType | undefined;
  const isPlayable = link.isPlayable && link.embedUrl;
  const hasNotes = Boolean(link.notes?.trim());

  // Determine what image to show
  const displayImage = link.thumbnailUrl || link.image;
  const isGoogleDoc = embedType === 'google-docs' || embedType === 'google-sheets' || embedType === 'google-slides';
  const isVideo = embedType === 'youtube' || embedType === 'vimeo';

  // Render the media preview section
  const renderMediaPreview = () => {
    // YouTube/Vimeo with thumbnail
    if (isVideo && link.thumbnailUrl && link.embedUrl) {
      return (
        <YouTubeThumbnail
          thumbnailUrl={link.thumbnailUrl}
          title={displayTitle}
          onPlay={() => setPlayerOpen(true)}
        />
      );
    }

    // Google Docs/Sheets/Slides
    if (isGoogleDoc) {
      return <GoogleDocsPreview link={link} />;
    }

    // Pinterest, ShotDeck, Canva - show large image
    if ((embedType === 'pinterest' || embedType === 'shotdeck' || embedType === 'canva') && displayImage && !imageError) {
      return (
        <div className="relative h-40 bg-muted overflow-hidden">
          <img
            src={displayImage}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {embedType && embedBadgeColors[embedType] && (
            <div className="absolute bottom-2 right-2">
              <Badge className={cn('text-xs', embedBadgeColors[embedType])}>
                {embedLabels[embedType]}
              </Badge>
            </div>
          )}
        </div>
      );
    }

    // Generic link with image
    if (displayImage && !imageError) {
      return (
        <div className="relative h-32 bg-muted overflow-hidden">
          <img
            src={displayImage}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      );
    }

    return null;
  };

  const hasMediaPreview = (isVideo && link.thumbnailUrl) || isGoogleDoc || (displayImage && !imageError);

  return (
    <>
      <Card className={cn('group overflow-hidden hover:shadow-md transition-shadow relative', className)}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={(e) => {
            // Prevent navigation if clicking play button
            if (isPlayable && playerOpen) {
              e.preventDefault();
            }
          }}
        >
          {/* Media Preview */}
          {renderMediaPreview()}

          <CardContent className={cn('p-4', hasMediaPreview ? 'pt-3' : '')}>
            {/* Header with favicon and site name */}
            <div className="flex items-center gap-2 mb-2">
              {link.favicon && !faviconError ? (
                <img
                  src={link.favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground truncate">
                {link.siteName || new URL(link.url).hostname}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {onNotesChange && (
                  <NotesEditor
                    notes={link.notes || ''}
                    onSave={(notes) => onNotesChange(link.id, notes)}
                    hasNotes={hasNotes}
                  />
                )}
                {!onNotesChange && hasNotes && (
                  <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
                )}
                <Badge
                  variant="secondary"
                  className={cn('text-xs', categoryColors[category])}
                >
                  {categoryLabels[category]}
                </Badge>
              </div>
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1">
              {displayTitle}
            </h3>

            {/* Description */}
            {link.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {link.description}
              </p>
            )}
          </CardContent>
        </a>

        {/* Action Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  window.open(link.url, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Link
              </DropdownMenuItem>
              {isPlayable && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setPlayerOpen(true);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play Video
                </DropdownMenuItem>
              )}
              {onRefresh && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onRefresh(link.id);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Metadata
                </DropdownMenuItem>
              )}
              {onCategoryChange && (
                <>
                  <DropdownMenuSeparator />
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={(e) => {
                        e.preventDefault();
                        onCategoryChange(link.id, key);
                      }}
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      {label}
                      {category === key && ' ✓'}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(link.id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Video Player Modal */}
      {isPlayable && link.embedUrl && (
        <EmbedPlayerModal
          open={playerOpen}
          onClose={() => setPlayerOpen(false)}
          embedUrl={link.embedUrl}
          title={displayTitle}
          embedType={embedType!}
        />
      )}
    </>
  );
}
