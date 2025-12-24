'use client';

/**
 * ExternalLinkCard - Minimal resource card
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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { EmbedType } from '@/lib/export/embed';

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

const categoryLabels: Record<string, string> = {
  script: 'Script',
  research: 'Research',
  reference: 'Reference',
  other: 'Other',
};

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
  const playerUrl = embedType === 'youtube'
    ? `${embedUrl}?autoplay=1&rel=0`
    : embedType === 'vimeo'
    ? `${embedUrl}?autoplay=1`
    : embedUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl p-0 overflow-hidden bg-black">
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

  useEffect(() => {
    setValue(notes);
  }, [notes]);

  const debouncedSave = useCallback((newValue: string) => {
    setSaving(true);
    setSaved(false);
    const timeout = setTimeout(() => {
      onSave(newValue);
      setSaving(false);
      setSaved(true);
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
            'h-6 w-6',
            hasNotes ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Notes</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {saved && !saving && <Check className="h-3 w-3 text-green-500" />}
            </div>
          </div>
          <Textarea
            placeholder="Add notes..."
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="min-h-[100px] resize-none text-sm"
          />
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
  const [playerOpen, setPlayerOpen] = useState(false);

  const displayTitle = link.title || link.siteName || new URL(link.url).hostname;
  const category = link.category || 'other';
  const embedType = link.embedType as EmbedType | undefined;
  const isPlayable = link.isPlayable && link.embedUrl;
  const hasNotes = Boolean(link.notes?.trim());

  const displayImage = link.thumbnailUrl || link.image;
  const isGoogleDoc = embedType === 'google-docs' || embedType === 'google-sheets' || embedType === 'google-slides';
  const isVideo = embedType === 'youtube' || embedType === 'vimeo';
  const hasImage = displayImage && !imageError;

  // Google doc icon
  const GoogleDocIcon = isGoogleDoc ? (
    embedType === 'google-sheets' ? Table2 :
    embedType === 'google-slides' ? Presentation : FileText
  ) : null;

  const docColors = {
    'google-docs': 'from-blue-500/20 to-blue-600/30',
    'google-sheets': 'from-green-500/20 to-green-600/30',
    'google-slides': 'from-amber-500/20 to-orange-500/30',
  };

  return (
    <>
      <Card className={cn(
        'group overflow-hidden rounded-xl border border-border/50',
        'hover:border-border hover:shadow-md transition-all duration-200 relative',
        className
      )}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={(e) => {
            if (isPlayable && playerOpen) e.preventDefault();
          }}
        >
          {/* Media Preview - only show if we have content */}
          {(hasImage || isGoogleDoc || isVideo) && (
            <div className="relative">
              {/* Video thumbnail */}
              {isVideo && hasImage && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlayerOpen(true);
                  }}
                  className="relative aspect-video w-full overflow-hidden group/thumb cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-9 bg-black/80 rounded-md flex items-center justify-center group-hover/thumb:bg-red-600 transition-colors">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </button>
              )}

              {/* Google Docs */}
              {isGoogleDoc && GoogleDocIcon && (
                <div className={cn(
                  'h-28 bg-gradient-to-br flex items-center justify-center',
                  docColors[embedType as keyof typeof docColors]
                )}>
                  <GoogleDocIcon className="w-10 h-10 text-foreground/20" />
                </div>
              )}

              {/* Regular image */}
              {!isVideo && !isGoogleDoc && hasImage && (
                <div className="relative aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImage!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {displayTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {link.siteName || new URL(link.url).hostname}
            </p>
          </div>
        </a>

        {/* Notes indicator */}
        {hasNotes && !onNotesChange && (
          <div className="absolute bottom-3 right-3">
            <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
          </div>
        )}

        {/* Action Menu - appears on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
          {onNotesChange && (
            <NotesEditor
              notes={link.notes || ''}
              onSave={(notes) => onNotesChange(link.id, notes)}
              hasNotes={hasNotes}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/90 backdrop-blur-sm shadow-sm"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); window.open(link.url, '_blank'); }}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              {isPlayable && (
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); setPlayerOpen(true); }}>
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </DropdownMenuItem>
              )}
              {onRefresh && (
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); onRefresh(link.id); }}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
              )}
              {onCategoryChange && (
                <>
                  <DropdownMenuSeparator />
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={(e) => { e.preventDefault(); onCategoryChange(link.id, key); }}
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
                    onClick={(e) => { e.preventDefault(); onDelete(link.id); }}
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
