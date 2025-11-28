'use client';

/**
 * AddLinkDialog
 *
 * Dialog for adding external links with metadata preview.
 */

import { useState, useCallback } from 'react';
import { Loader2, Link, ExternalLink, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ExternalLinkCard, ExternalLinkData } from './external-link-card';

interface AddLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (linkData: Omit<ExternalLinkData, 'id' | 'createdAt'>) => Promise<void>;
  projectId: string;
}

interface MetadataState {
  url: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
  siteName: string | null;
  category: string | null;
}

export function AddLinkDialog({
  isOpen,
  onClose,
  onAdd,
  projectId: _projectId,
}: AddLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataState | null>(null);

  const resetState = useCallback(() => {
    setUrl('');
    setMetadata(null);
    setError(null);
    setIsFetching(false);
    setIsAdding(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const fetchMetadata = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const response = await fetch('/api/links/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch metadata');
      }

      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
      // Still allow adding with minimal metadata
      setMetadata({
        url,
        title: null,
        description: null,
        favicon: null,
        image: null,
        siteName: new URL(url).hostname,
        category: 'other',
      });
    } finally {
      setIsFetching(false);
    }
  }, [url]);

  const handleAdd = useCallback(async () => {
    if (!metadata) return;

    setIsAdding(true);
    setError(null);

    try {
      await onAdd(metadata);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link');
      setIsAdding(false);
    }
  }, [metadata, onAdd, handleClose]);

  const handleCategoryChange = useCallback((category: string) => {
    if (metadata) {
      setMetadata({ ...metadata, category });
    }
  }, [metadata]);

  const previewLink: ExternalLinkData | null = metadata
    ? {
        id: 'preview',
        ...metadata,
        createdAt: new Date().toISOString(),
      }
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Add External Link
          </DialogTitle>
          <DialogDescription>
            Add a link to Google Docs, research materials, or any external resource.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://docs.google.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !metadata) {
                    e.preventDefault();
                    fetchMetadata();
                  }
                }}
                disabled={isFetching || !!metadata}
              />
              {!metadata && (
                <Button
                  onClick={fetchMetadata}
                  disabled={isFetching || !url.trim()}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Preview'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Preview Card */}
          {previewLink && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMetadata(null);
                    setError(null);
                  }}
                >
                  Change URL
                </Button>
              </div>
              <ExternalLinkCard link={previewLink} className="pointer-events-none" />

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={metadata?.category || 'other'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!metadata || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Add Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
