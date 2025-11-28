"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Eye, Globe, Lock, ExternalLink } from "lucide-react";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
}

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Documentary",
  "Animation",
  "Other",
];

interface PublishStatus {
  id: string;
  isPublic: boolean;
  genre: string | null;
  publishedAt: string | null;
  views: number;
}

export function PublishDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
}: PublishDialogProps) {
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [genre, setGenre] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/read/${screenplayId}`
    : "";

  useEffect(() => {
    if (open && screenplayId) {
      fetchStatus();
    }
  }, [open, screenplayId]);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/publish`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setIsPublic(data.isPublic);
        setGenre(data.genre || "none");
      }
    } catch (error) {
      console.error("Error fetching publish status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic,
          genre: genre === "none" ? null : genre,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error updating publish status:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Settings</DialogTitle>
          <DialogDescription>
            Control who can view &quot;{screenplayTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Public Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public-toggle" className="flex items-center gap-2">
                  {isPublic ? (
                    <Globe className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  {isPublic ? "Public" : "Private"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? "Anyone can view this screenplay"
                    : "Only you can view this screenplay"}
                </p>
              </div>
              <Switch
                id="public-toggle"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {/* Genre Selector (only when public) */}
            {isPublic && (
              <div className="space-y-2">
                <Label htmlFor="genre">Genre (optional)</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No genre</SelectItem>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Share Link (only when public) */}
            {isPublic && (
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Stats (only when published) */}
            {status?.isPublic && status.publishedAt && (
              <div className="flex items-center gap-4 pt-2 border-t">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {status.views} view{status.views !== 1 ? "s" : ""}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Published{" "}
                  {new Date(status.publishedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
