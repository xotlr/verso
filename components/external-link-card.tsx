'use client';

/**
 * ExternalLinkCard
 *
 * A preview card for external links (Google Docs, research URLs, etc.)
 */

import { useState } from 'react';
import { ExternalLink, Trash2, MoreHorizontal, RefreshCw, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

interface ExternalLinkCardProps {
  link: ExternalLinkData;
  onDelete?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onCategoryChange?: (id: string, category: string) => void;
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

export function ExternalLinkCard({
  link,
  onDelete,
  onRefresh,
  onCategoryChange,
  className,
}: ExternalLinkCardProps) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const displayTitle = link.title || link.siteName || new URL(link.url).hostname;
  const category = link.category || 'other';

  return (
    <Card className={cn('group overflow-hidden hover:shadow-md transition-shadow', className)}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Image Preview */}
        {link.image && !imageError && (
          <div className="relative h-32 bg-muted overflow-hidden">
            <img
              src={link.image}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        <CardContent className={cn('p-4', link.image && !imageError ? 'pt-3' : '')}>
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
            <Badge
              variant="secondary"
              className={cn('ml-auto text-xs', categoryColors[category])}
            >
              {categoryLabels[category]}
            </Badge>
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
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {category === key && ' *'}
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
  );
}
