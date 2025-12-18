'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Check, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimelapseShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
}

interface TimelapseSettings {
  enabled: boolean;
  started: string | null;
  shareId: string | null;
  shareUrl: string | null;
  operationCount: number;
  durationMs: number;
}

export function TimelapseShareDialog({
  open,
  onOpenChange,
  screenplayId,
}: TimelapseShareDialogProps) {
  const [settings, setSettings] = useState<TimelapseSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load timelapse settings
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/timelapse`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load timelapse settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenplayId]);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  // Toggle timelapse recording
  const toggleRecording = async (enabled: boolean) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/timelapse`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => prev ? { ...prev, enabled: data.enabled } : null);
        toast.success(enabled ? 'Timelapse recording enabled' : 'Timelapse recording disabled');
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      toast.error('Failed to update settings');
    }
  };

  // Generate share link
  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/timelapse/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) =>
          prev ? { ...prev, shareId: data.shareId, shareUrl: data.shareUrl } : null
        );
        toast.success('Share link generated');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
      toast.error('Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  // Revoke share link
  const revokeShareLink = async () => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/timelapse/share`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSettings((prev) =>
          prev ? { ...prev, shareId: null, shareUrl: null } : null
        );
        toast.success('Share link revoked');
      }
    } catch (error) {
      console.error('Failed to revoke share link:', error);
      toast.error('Failed to revoke share link');
    }
  };

  // Copy link to clipboard
  const copyLink = async () => {
    if (!settings?.shareUrl) return;

    const fullUrl = `${window.location.origin}${settings.shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('Link copied to clipboard');
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Timelapse Settings</DialogTitle>
          <DialogDescription>
            Record and share your writing process as a timelapse video.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading settings...
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Recording toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recording">Record timelapse</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically capture writing changes
                </p>
              </div>
              <Switch
                id="recording"
                checked={settings.enabled}
                onCheckedChange={toggleRecording}
              />
            </div>

            {/* Stats */}
            {settings.started && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Operations recorded</span>
                  <span className="font-medium">{settings.operationCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recording duration</span>
                  <span className="font-medium">{formatDuration(settings.durationMs)}</span>
                </div>
              </div>
            )}

            {/* Share link */}
            <div className="space-y-3">
              <Label>Share link</Label>

              {settings.shareUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}${settings.shareUrl}`}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                      title="Copy link"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                      title="Open in new tab"
                    >
                      <a
                        href={settings.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateShareLink}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      <RefreshCw className={cn('h-4 w-4 mr-2', isGenerating && 'animate-spin')} />
                      Regenerate link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={revokeShareLink}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={generateShareLink}
                  disabled={isGenerating || !settings.started}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate share link'
                  )}
                </Button>
              )}

              {!settings.started && (
                <p className="text-sm text-muted-foreground">
                  Start writing to create a timelapse that can be shared.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load settings
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
