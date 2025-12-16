"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Eye,
  Link2,
  Link2Off,
  RefreshCw,
  Calendar,
  MessageSquare,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
}

type Permission = "VIEW" | "COMMENT" | "EDIT";

interface ShareLink {
  id: string;
  token: string;
  permission: Permission;
  isActive: boolean;
  expiresAt: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_INFO: Record<Permission, { label: string; description: string; icon: React.ReactNode }> = {
  VIEW: {
    label: "View only",
    description: "Can read the screenplay",
    icon: <Eye className="h-4 w-4" />,
  },
  COMMENT: {
    label: "Comment",
    description: "Can read and add comments",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  EDIT: {
    label: "Edit",
    description: "Can make changes",
    icon: <Pencil className="h-4 w-4" />,
  },
};

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function getExpirationDate(value: string): string | null {
  if (value === "never") return null;
  const days = parseInt(value);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getExpirationValue(expiresAt: string | null): string {
  if (!expiresAt) return "never";
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 1) return "1d";
  if (days <= 7) return "7d";
  if (days <= 30) return "30d";
  return "90d";
}

export function ShareDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
}: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [permission, setPermission] = useState<Permission>("VIEW");
  const [expiration, setExpiration] = useState("never");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && screenplayId) {
      fetchShareLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, screenplayId]);

  const fetchShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`);
      if (response.ok) {
        const data = await response.json();
        if (data.shareLink) {
          setShareLink(data.shareLink);
          setPermission(data.shareLink.permission);
          setExpiration(getExpirationValue(data.shareLink.expiresAt));
        } else {
          setShareLink(null);
        }
      }
    } catch (error) {
      console.error("Error fetching share link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createShareLink = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission,
          expiresAt: getExpirationDate(expiration),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.shareLink);
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateShareLink = async (updates: Partial<{ permission: Permission; expiresAt: string | null; isActive: boolean }>) => {
    if (!shareLink) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.shareLink);
      }
    } catch (error) {
      console.error("Error updating share link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const revokeShareLink = async () => {
    if (!shareLink) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShareLink(null);
        setPermission("VIEW");
        setExpiration("never");
      }
    } catch (error) {
      console.error("Error revoking share link:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateLink = async () => {
    // Delete and recreate with same settings
    setIsRegenerating(true);
    try {
      await fetch(`/api/screenplays/${screenplayId}/share`, { method: "DELETE" });
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission,
          expiresAt: getExpirationDate(expiration),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.shareLink);
      }
    } catch (error) {
      console.error("Error regenerating share link:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink?.url) return;
    await navigator.clipboard.writeText(shareLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePermissionChange = (newPermission: Permission) => {
    setPermission(newPermission);
    if (shareLink) {
      updateShareLink({ permission: newPermission });
    }
  };

  const handleExpirationChange = (newExpiration: string) => {
    setExpiration(newExpiration);
    if (shareLink) {
      updateShareLink({ expiresAt: getExpirationDate(newExpiration) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share
          </DialogTitle>
          <DialogDescription>
            Share &quot;{screenplayTitle}&quot; with a link
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : !shareLink ? (
          // No share link exists - show creation UI
          <div className="space-y-6 py-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Link2Off className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No share link exists. Create one to share this screenplay.
              </p>
            </div>

            {/* Permission selector */}
            <div className="space-y-2">
              <Label>Permission level</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PERMISSION_INFO) as Permission[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPermission(p)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                      permission === p
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {PERMISSION_INFO[p].icon}
                    <span className="text-xs font-medium">{PERMISSION_INFO[p].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration selector */}
            <div className="space-y-2">
              <Label htmlFor="expiration">Link expires</Label>
              <Select value={expiration} onValueChange={setExpiration}>
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={createShareLink}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          </div>
        ) : (
          // Share link exists - show management UI
          <div className="space-y-6 py-4">
            {/* Link URL */}
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink.url}
                  readOnly
                  className="text-sm font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Permission selector */}
            <div className="space-y-2">
              <Label>Permission level</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PERMISSION_INFO) as Permission[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePermissionChange(p)}
                    disabled={isSaving}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                      permission === p
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30",
                      isSaving && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {PERMISSION_INFO[p].icon}
                    <span className="text-xs font-medium">{PERMISSION_INFO[p].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration selector */}
            <div className="space-y-2">
              <Label htmlFor="expiration" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Link expires
              </Label>
              <Select
                value={expiration}
                onValueChange={handleExpirationChange}
                disabled={isSaving}
              >
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {shareLink.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires on {new Date(shareLink.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge variant={shareLink.isActive ? "default" : "secondary"}>
                {shareLink.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created {new Date(shareLink.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateLink}
                disabled={isRegenerating || isSaving}
                className="flex-1"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                New Link
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={revokeShareLink}
                disabled={isSaving}
                className="flex-1"
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Revoke
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
