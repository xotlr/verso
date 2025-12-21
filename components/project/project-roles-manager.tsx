'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Users,
  Clapperboard,
  PenTool,
  Music,
  Palette,
  Megaphone,
  Scissors,
  User,
  Camera,
  Headphones,
  Send,
  Mail,
  UserPlus,
  Copy,
  Check,
  Clock,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ProjectRole {
  id: string;
  role: string;
  name: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  inviter: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ProjectRolesManagerProps {
  projectId: string;
  roles: ProjectRole[];
  onRolesChange: (roles: ProjectRole[]) => void;
}

// Role definitions with icons and colors
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500' },
  { value: 'other', label: 'Other', icon: User, color: 'text-gray-500' },
];

// Get role label from value
function getRoleLabel(roleValue: string): string {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.label || roleValue;
}

// Get role icon from value
function getRoleIcon(roleValue: string) {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.icon || User;
}

// Get role color from value
function getRoleColor(roleValue: string) {
  const def = ROLE_DEFINITIONS.find((r) => r.value === roleValue);
  return def?.color || 'text-gray-500';
}

// Check if string is an email
function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export function ProjectRolesManager({
  projectId,
  roles,
  onRolesChange,
}: ProjectRolesManagerProps) {
  const { data: session } = useSession();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRole, setNewRole] = useState({ role: '', name: '' });
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pending invites
  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/role-invites`);
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Search users with debounce
  useEffect(() => {
    const query = newRole.name.trim();

    if (query.length < 2 || isEmail(query)) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const users = await res.json();
          setSearchResults(users);
          setShowDropdown(users.length > 0);
        }
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newRole.name]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRole = async (options?: { userId?: string; name?: string; assignSelf?: boolean }) => {
    const role = newRole.role;
    if (!role) {
      toast.error('Please select a role');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { role };

      if (options?.assignSelf) {
        body.assignSelf = true;
      } else if (options?.userId) {
        body.userId = options.userId;
        if (options.name) body.name = options.name;
      } else if (newRole.name.trim()) {
        body.name = newRole.name.trim();
      } else {
        toast.error('Please enter a name');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add role');
      }

      const addedRole = await response.json();
      onRolesChange([...roles, addedRole]);
      setNewRole({ role: '', name: '' });
      setIsAdding(false);
      setShowDropdown(false);
      toast.success('Team member added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendInvite = async () => {
    const email = newRole.name.trim().toLowerCase();
    if (!newRole.role) {
      toast.error('Please select a role');
      return;
    }
    if (!isEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/role-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole.role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invite');
      }

      const invite = await response.json();
      setPendingInvites([invite, ...pendingInvites]);
      setNewRole({ role: '', name: '' });
      setIsAdding(false);

      // Copy invite link to clipboard
      if (invite.inviteUrl) {
        await navigator.clipboard.writeText(invite.inviteUrl);
        toast.success('Invite created! Link copied to clipboard');
      } else {
        toast.success('Invite sent');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/role-invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke invite');
      }

      setPendingInvites(pendingInvites.filter((i) => i.id !== inviteId));
      toast.success('Invite revoked');
    } catch {
      toast.error('Failed to revoke invite');
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/project-invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success('Link copied to clipboard');
  };

  const deleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete role');
      }

      onRolesChange(roles.filter((r) => r.id !== roleId));
      toast.success('Team member removed');
    } catch {
      toast.error('Failed to remove team member');
    }
  };

  const selectUser = (user: SearchUser) => {
    addRole({ userId: user.id, name: user.name || user.email });
    setShowDropdown(false);
  };

  const assignSelf = () => {
    if (!newRole.role) {
      toast.error('Please select a role first');
      return;
    }
    addRole({ assignSelf: true });
  };

  const inputIsEmail = isEmail(newRole.name.trim());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </h3>
          <p className="text-sm text-muted-foreground">
            {roles.filter((r) => r.userId !== null).length} member{roles.filter((r) => r.userId !== null).length !== 1 ? 's' : ''}
            {roles.filter((r) => r.userId === null).length > 0 && ` · ${roles.filter((r) => r.userId === null).length} unfilled`}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
          </p>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Inline Add Form */}
      {isAdding && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={newRole.role}
              onValueChange={(value) => setNewRole((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_DEFINITIONS.map((role) => {
                  const Icon = role.icon;
                  return (
                    <SelectItem key={role.value} value={role.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', role.color)} />
                        {role.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="relative flex-1" ref={dropdownRef}>
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="Search users or enter email..."
                  value={newRole.name}
                  onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
                  className={cn(newRole.name.trim() && "pr-8")}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRole.role && newRole.name.trim()) {
                    e.preventDefault();
                    if (inputIsEmail) {
                      sendInvite();
                    } else if (!showDropdown) {
                      addRole();
                    }
                  }
                  if (e.key === 'Escape') {
                    if (showDropdown) {
                      setShowDropdown(false);
                    } else {
                      setIsAdding(false);
                      setNewRole({ role: '', name: '' });
                    }
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0 && !inputIsEmail) {
                    setShowDropdown(true);
                  }
                }}
                autoFocus
                />
                {/* Auto-detect indicator */}
                {newRole.name.trim() && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {inputIsEmail ? (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : searchResults.length > 0 ? (
                      <Users className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* User search dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <ScrollArea className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px]">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                      onClick={() => selectUser(user)}
                    >
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage src={user.image || undefined} className="rounded-md object-cover" />
                        <AvatarFallback className="text-xs rounded-md bg-muted text-muted-foreground">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{user.name || user.email}</div>
                        {user.name && (
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 sm:gap-3">
              {inputIsEmail ? (
                <Button
                  size="sm"
                  onClick={sendInvite}
                  disabled={isSubmitting || !newRole.role}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1.5" />
                      Invite
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => addRole()}
                  disabled={isSubmitting || !newRole.role || !newRole.name.trim()}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? (
                    'Adding...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Add
                    </>
                  )}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewRole({ role: '', name: '' });
                  setShowDropdown(false);
                }}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {inputIsEmail
                ? 'Email detected - click Invite to send an invite link'
                : 'Search for existing users, enter an email to invite, or type a name'
              }
            </p>
            {newRole.role && (
              <Button
                size="sm"
                variant="outline"
                onClick={assignSelf}
                disabled={isSubmitting}
                className="gap-1.5 w-full sm:w-auto"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign Myself
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Invites
          </h4>
          <div className="border border-dashed border-border rounded-lg divide-y divide-dashed divide-border">
            {pendingInvites.map((invite) => {
              const Icon = getRoleIcon(invite.role);
              const colorClass = getRoleColor(invite.role);
              return (
                <div
                  key={invite.id}
                  className="group flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{invite.email}</div>
                      <div className={cn('flex items-center gap-1.5 text-xs', colorClass)}>
                        <Icon className="h-3 w-3" />
                        {getRoleLabel(invite.role)}
                        <span className="text-muted-foreground ml-1">· pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => copyInviteLink(invite.token)}
                    >
                      {copiedToken === invite.token ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => revokeInvite(invite.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team List */}
      {roles.length === 0 && !isAdding && pendingInvites.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="No team members yet"
          description="Add directors, writers, producers, and other key crew members"
          action={{
            label: 'Add Member',
            onClick: () => setIsAdding(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : roles.length > 0 ? (
        <>
          {/* Filled Roles */}
          {roles.filter((r) => r.userId !== null).length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border">
              {roles.filter((r) => r.userId !== null).map((role) => {
                const Icon = getRoleIcon(role.role);
                const colorClass = getRoleColor(role.role);
                return (
                  <div
                    key={role.id}
                    className="group flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-md">
                        <AvatarImage src={role.user?.image || undefined} className="rounded-md object-cover" />
                        <AvatarFallback className="text-sm font-medium rounded-md bg-muted text-muted-foreground">
                          {role.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {role.name}
                          {role.userId === session?.user?.id && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className={cn('flex items-center gap-1.5 text-xs', colorClass)}>
                          <Icon className="h-3 w-3" />
                          {getRoleLabel(role.role)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unfilled Roles */}
          {roles.filter((r) => r.userId === null).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Unfilled Roles
              </h4>
              <div className="border border-dashed border-border rounded-lg divide-y divide-dashed divide-border">
                {roles.filter((r) => r.userId === null).map((role) => {
                  const Icon = getRoleIcon(role.role);
                  const colorClass = getRoleColor(role.role);
                  return (
                    <div
                      key={role.id}
                      className="group flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                          <Icon className={cn('h-4 w-4', colorClass)} />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-muted-foreground">
                            {getRoleLabel(role.role)}
                          </div>
                          <div className="text-xs text-muted-foreground/70">
                            Looking for talent
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setNewRole({ role: role.role, name: '' });
                            setIsAdding(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Assign
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
