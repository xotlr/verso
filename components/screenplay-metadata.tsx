'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScreenplayMetadataProps {
  screenplayId: string;
  initialLogline?: string | null;
  initialGenre?: string | null;
  initialAuthor?: string | null;
  className?: string;
}

export function ScreenplayMetadata({
  screenplayId,
  initialLogline,
  initialGenre,
  initialAuthor,
  className,
}: ScreenplayMetadataProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logline, setLogline] = useState(initialLogline || '');
  const [genre, setGenre] = useState(initialGenre || '');
  const [author, setAuthor] = useState(initialAuthor || '');

  const updateMetadata = useCallback(async (field: string, value: string) => {
    try {
      await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      });
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }, [screenplayId]);

  return (
    <div className={cn('border-b bg-muted/30', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium text-muted-foreground">
          Screenplay Metadata
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logline" className="text-sm">
              Logline
            </Label>
            <Textarea
              id="logline"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              onBlur={() => updateMetadata('logline', logline)}
              placeholder="Enter a brief one-sentence description..."
              className="resize-none h-20 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre" className="text-sm">
                Genre
              </Label>
              <Input
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                onBlur={() => updateMetadata('genre', genre)}
                placeholder="e.g., Drama, Thriller"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm">
                Author
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onBlur={() => updateMetadata('author', author)}
                placeholder="Written by..."
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
