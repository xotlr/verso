'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface ScreenplayDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  screenplayId: string;
  logline?: string | null;
  genre?: string | null;
  author?: string | null;
  type?: 'FEATURE' | 'TV' | 'SHORT';
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}

export function ScreenplayDetailsDrawer({
  isOpen,
  onClose,
  screenplayId,
  logline,
  genre,
  author,
  type,
  season,
  episode,
  episodeTitle,
}: ScreenplayDetailsDrawerProps) {
  const [localType, setLocalType] = useState(type || 'FEATURE');

  const updateField = async (field: string, value: any) => {
    try {
      await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Screenplay Details</SheetTitle>
          <SheetDescription>
            Manage screenplay information and metadata
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Primary Info Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Primary Info
            </h3>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="logline">Logline</Label>
                <Textarea
                  id="logline"
                  placeholder="A brief one-sentence description..."
                  className="resize-none h-24"
                  defaultValue={logline || ''}
                  onBlur={(e) => updateField('logline', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="e.g., Drama"
                    defaultValue={genre || ''}
                    onBlur={(e) => updateField('genre', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    placeholder="Written by..."
                    defaultValue={author || ''}
                    onBlur={(e) => updateField('author', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Type & Episode Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Format
            </h3>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={localType}
                  onValueChange={(val) => {
                    setLocalType(val as any);
                    updateField('type', val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEATURE">Feature Film</SelectItem>
                    <SelectItem value="TV">TV Episode</SelectItem>
                    <SelectItem value="SHORT">Short Film</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {localType === 'TV' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="season">Season</Label>
                      <Input
                        type="number"
                        id="season"
                        defaultValue={season || ''}
                        onBlur={(e) => updateField('season', parseInt(e.target.value) || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="episode">Episode</Label>
                      <Input
                        type="number"
                        id="episode"
                        defaultValue={episode || ''}
                        onBlur={(e) => updateField('episode', parseInt(e.target.value) || null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="episodeTitle">Episode Title</Label>
                    <Input
                      id="episodeTitle"
                      defaultValue={episodeTitle || ''}
                      onBlur={(e) => updateField('episodeTitle', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
