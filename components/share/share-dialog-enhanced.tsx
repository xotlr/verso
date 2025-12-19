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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { UserSearch } from "./user-search";
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
  Users,
  Trash2,
  Mail,
  Crown,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN";
type LinkPermission = "VIEW" | "COMMENT" | "EDIT";

interface ShareUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Share {
  id: string;
  role: ShareRole;
  createdAt: string;
  user: ShareUser;
  sharer?: { id: string; name: string | null };
}

interface PendingInvite {
  id: string;
  email: string;
  role: ShareRole;
  createdAt: string;
  expiresAt: string;
  inviter?: { id: string; name: string | null };
}

interface ShareLink {
  id: string;
  token: string;
  permission: LinkPermission;
  isActive: boolean;
  expiresAt: string | null;
  url: string;
  createdAt: string;
}

interface ShareDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
}

// Role info for display
const ROLE_INFO: Record<ShareRole, { label: string; description: string; icon: React.ReactNode }> = {
  VIEWER: {
    label: "Viewer",
    description: "Can view only",
    icon: <Eye className="h-4 w-4" />,
  },
  COMMENTER: {
    label: "Commenter",
    description: "Can view and comment",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  EDITOR: {
    label: "Editor",
    description: "Can edit content",
    icon: <Pencil className="h-4 w-4" />,
  },
  ADMIN: {
    label: "Admin",
    description: "Can edit and manage sharing",
    icon: <Shield className="h-4 w-4" />,
  },
};

const LINK_PERMISSION_INFO: Record<LinkPermission, { label: string; icon: React.ReactNode }> = {
  VIEW: { label: "View only", icon: <Eye className="h-4 w-4" /> },
  COMMENT: { label: "Comment", icon: <MessageSquare className="h-4 w-4" /> },
  EDIT: { label: "Edit", icon: <Pencil className="h-4 w-4" /> },
};

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function getExpirationDate(value: string): string | null {
  if (value === "never") return null;
  const days = parseInt(value);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function ShareDialogEnhanced({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
}: ShareDialogEnhancedProps) {
  // User sharing state
  const [owner, setOwner] = useState<ShareUser | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedRole, setSelectedRole] = useState<ShareRole>("VIEWER");
  const [emailInput, setEmailInput] = useState("");
  const [isLoadingShares, setIsLoadingShares] = useState(true);
  const [isSavingShare, setIsSavingShare] = useState(false);

  // Link sharing state
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [linkPermission, setLinkPermission] = useState<LinkPermission>("VIEW");
  const [linkExpiration, setLinkExpiration] = useState("never");
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load data when dialog opens
  useEffect(() => {
    if (open && screenplayId) {
      fetchShares();
      fetchShareLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, screenplayId]);

  const fetchShares = async () => {
    setIsLoadingShares(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/shares`);
      if (response.ok) {
        const data = await response.json();
        setOwner(data.owner);
        setShares(data.shares || []);
        setPendingInvites(data.pendingInvites || []);
      }
    } catch (error) {
      console.error("Error fetching shares:", error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  const fetchShareLink = async () => {
    setIsLoadingLink(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShareLink(data.shareLink || null);
        if (data.shareLink) {
          setLinkPermission(data.shareLink.permission);
        }
      }
    } catch (error) {
      console.error("Error fetching share link:", error);
    } finally {
      setIsLoadingLink(false);
    }
  };

  // User sharing handlers
  const handleUserSelect = async (user: { id: string; name: string | null; email: string | null; image: string | null }) => {
    setIsSavingShare(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: selectedRole }),
      });

      if (response.ok) {
        const share = await response.json();
        setShares((prev) => [share, ...prev]);
        toast.success(`Shared with ${user.name || user.email}`);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to share");
      }
    } catch (error) {
      console.error("Error creating share:", error);
      toast.error("Failed to share");
    } finally {
      setIsSavingShare(false);
    }
  };

  const handleEmailInvite = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSavingShare(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), role: selectedRole }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.type === "invite") {
          setPendingInvites((prev) => [data.invite, ...prev]);
          toast.success(`Invite sent to ${emailInput}`);
        } else {
          setShares((prev) => [data, ...prev]);
          toast.success(`Shared with ${emailInput}`);
        }
        setEmailInput("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to invite");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite");
    } finally {
      setIsSavingShare(false);
    }
  };

  const updateShareRole = async (shareId: string, newRole: ShareRole) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setShares((prev) =>
          prev.map((s) => (s.id === shareId ? { ...s, role: newRole } : s))
        );
        toast.success("Permission updated");
      }
    } catch (error) {
      console.error("Error updating share:", error);
      toast.error("Failed to update permission");
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/shares/${shareId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
        setPendingInvites((prev) => prev.filter((i) => i.id !== shareId));
        toast.success("Access removed");
      }
    } catch (error) {
      console.error("Error removing share:", error);
      toast.error("Failed to remove access");
    }
  };

  // Link sharing handlers
  const createShareLink = async () => {
    setIsSavingLink(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission: linkPermission,
          expiresAt: getExpirationDate(linkExpiration),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.shareLink);
        toast.success("Share link created");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error("Failed to create link");
    } finally {
      setIsSavingLink(false);
    }
  };

  const updateShareLink = async (updates: Partial<{ permission: LinkPermission; expiresAt: string | null }>) => {
    if (!shareLink) return;

    setIsSavingLink(true);
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
      setIsSavingLink(false);
    }
  };

  const revokeShareLink = async () => {
    setIsSavingLink(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/share`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShareLink(null);
        toast.success("Link revoked");
      }
    } catch (error) {
      console.error("Error revoking share link:", error);
    } finally {
      setIsSavingLink(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink?.url) return;
    await navigator.clipboard.writeText(shareLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied");
  };

  // Get existing user IDs for exclusion
  const existingUserIds = [
    owner?.id,
    ...shares.map((s) => s.user.id),
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share &quot;{screenplayTitle}&quot;</DialogTitle>
          <DialogDescription>
            Share with specific people or create a shareable link
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="people" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people" className="gap-2">
              <Users className="h-4 w-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* People Tab */}
          <TabsContent value="people" className="space-y-4 mt-4">
            {/* Add people section */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <UserSearch
                    onSelect={handleUserSelect}
                    excludeIds={existingUserIds}
                    placeholder="Search users..."
                  />
                </div>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ShareRole)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_INFO) as ShareRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {ROLE_INFO[role].icon}
                          {ROLE_INFO[role].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email invite */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Or invite by email..."
                  onKeyDown={(e) => e.key === "Enter" && handleEmailInvite()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleEmailInvite}
                  disabled={isSavingShare || !emailInput.trim()}
                >
                  {isSavingShare ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* People with access */}
            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground mb-3 block">People with access</Label>

              {isLoadingShares ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Owner */}
                  {owner && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <ProfileAvatar
                        userId={owner.id}
                        imageUrl={owner.image}
                        name={owner.name || "Owner"}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{owner.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    </div>
                  )}

                  {/* Shares */}
                  {shares.map((share) => (
                    <div key={share.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <ProfileAvatar
                        userId={share.user.id}
                        imageUrl={share.user.image}
                        name={share.user.name || "User"}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{share.user.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{share.user.email}</p>
                      </div>
                      <Select
                        value={share.role}
                        onValueChange={(v) => updateShareRole(share.id, v as ShareRole)}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_INFO) as ShareRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_INFO[role].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeShare(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Pending invites */}
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">Pending invite</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_INFO[invite.role].label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeShare(invite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {shares.length === 0 && pendingInvites.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Not shared with anyone yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            {isLoadingLink ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !shareLink ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Link2Off className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a link to share with anyone
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(LINK_PERMISSION_INFO) as LinkPermission[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLinkPermission(p)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                          linkPermission === p
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        {LINK_PERMISSION_INFO[p].icon}
                        <span className="text-xs font-medium">{LINK_PERMISSION_INFO[p].label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Link expires</Label>
                    <Select value={linkExpiration} onValueChange={setLinkExpiration}>
                      <SelectTrigger>
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

                  <Button className="w-full" onClick={createShareLink} disabled={isSavingLink}>
                    {isSavingLink ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Create Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Link URL */}
                <div className="space-y-2">
                  <Label>Share link</Label>
                  <div className="flex gap-2">
                    <Input value={shareLink.url} readOnly className="text-sm font-mono" />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Permission */}
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LINK_PERMISSION_INFO) as LinkPermission[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setLinkPermission(p);
                        updateShareLink({ permission: p });
                      }}
                      disabled={isSavingLink}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                        shareLink.permission === p
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      {LINK_PERMISSION_INFO[p].icon}
                      <span className="text-xs font-medium">{LINK_PERMISSION_INFO[p].label}</span>
                    </button>
                  ))}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Badge variant={shareLink.isActive ? "default" : "secondary"}>
                    {shareLink.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {shareLink.expiresAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires {new Date(shareLink.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
                      await revokeShareLink();
                      await createShareLink();
                    }}
                    disabled={isSavingLink}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Link
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={revokeShareLink}
                    disabled={isSavingLink}
                  >
                    <Link2Off className="h-4 w-4 mr-2" />
                    Revoke
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
