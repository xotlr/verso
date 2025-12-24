'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Copy, Check, ExternalLink, User, Film, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { extractCharactersFromJson, extractScenesFromJson } from '@/lib/screenplay/sides-filter';

interface SidesGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
  screenplayContent: string;
}

interface CreatedSide {
  id: string;
  token: string;
  title: string;
}

export function SidesGeneratorDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
  screenplayContent,
}: SidesGeneratorDialogProps) {
  const [filterType, setFilterType] = useState<'all' | 'character' | 'scenes'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [title, setTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState<'never' | '1day' | '7days' | '30days'>('never');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSide, setCreatedSide] = useState<CreatedSide | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract characters and scenes from content
  const [characters, setCharacters] = useState<Array<{ name: string; dialogueCount: number }>>([]);
  const [scenes, setScenes] = useState<Array<{ id: string; heading: string; number?: string }>>([]);

  useEffect(() => {
    if (open && screenplayContent) {
      try {
        const content = JSON.parse(screenplayContent);
        setCharacters(extractCharactersFromJson(content));
        setScenes(extractScenesFromJson(content));
      } catch {
        console.error('Failed to parse screenplay content');
      }
    }
  }, [open, screenplayContent]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFilterType('all');
      setFilterValue('');
      setTitle('');
      setExpiresIn('never');
      setCreatedSide(null);
      setCopied(false);
    }
  }, [open]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = expiresIn === '1day' ? 1 : expiresIn === '7days' ? 7 : 30;
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const response = await fetch(`/api/screenplays/${screenplayId}/sides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterType,
          filterValue: filterValue || undefined,
          title: title || undefined,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create sides');
      }

      const { side } = await response.json();
      setCreatedSide(side);
      toast.success('Digital sides created');
    } catch (error) {
      console.error('Error creating sides:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create sides');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdSide) return;
    const url = `${window.location.origin}/sides/${createdSide.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    if (!createdSide) return;
    window.open(`/sides/${createdSide.token}`, '_blank');
  };

  const getDefaultTitle = () => {
    if (filterType === 'character' && filterValue) {
      return `${filterValue}'s Sides`;
    }
    if (filterType === 'scenes') {
      return 'Selected Scenes';
    }
    return `${screenplayTitle} - Full Sides`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Digital Sides</DialogTitle>
          <DialogDescription>
            Generate a shareable link with filtered screenplay pages
          </DialogDescription>
        </DialogHeader>

        {!createdSide ? (
          <div className="space-y-4">
            {/* Filter Type */}
            <div className="space-y-2">
              <Label>Filter Type</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Screenplay
                    </div>
                  </SelectItem>
                  <SelectItem value="character">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      By Character
                    </div>
                  </SelectItem>
                  <SelectItem value="scenes">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Selected Scenes
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Character Selector */}
            {filterType === 'character' && (
              <div className="space-y-2">
                <Label>Character</Label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a character" />
                  </SelectTrigger>
                  <SelectContent>
                    {characters.map((char) => (
                      <SelectItem key={char.name} value={char.name}>
                        {char.name} ({char.dialogueCount} lines)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shows only scenes where this character appears
                </p>
              </div>
            )}

            {/* Scene Selector */}
            {filterType === 'scenes' && (
              <div className="space-y-2">
                <Label>Scenes (comma-separated numbers)</Label>
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="1, 3, 5, 7"
                />
                <p className="text-xs text-muted-foreground">
                  {scenes.length} scenes available. Enter scene numbers separated by commas.
                </p>
              </div>
            )}

            {/* Custom Title */}
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getDefaultTitle()}
              />
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label>Expires</Label>
              <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as typeof expiresIn)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="1day">In 1 day</SelectItem>
                  <SelectItem value="7days">In 7 days</SelectItem>
                  <SelectItem value="30days">In 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || (filterType === 'character' && !filterValue)}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Sides
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">{createdSide.title}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/sides/${createdSide.token}`}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleOpen}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
