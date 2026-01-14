'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Search, X, Crown, Shield, UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Logo } from '@/components/logo';

interface Team {
  id: string;
  name: string;
  logo?: string | null;
  _count?: {
    members: number;
  };
  members?: Array<{
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
}

interface MoveToTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
  currentTeamId?: string | null;
  onSuccess: () => void;
}

// Generate a consistent color for a team based on its ID
function getTeamColor(teamId: string): string {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  const hash = teamId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: UserIcon,
} as const;

export function MoveToTeamDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
  currentTeamId,
  onSuccess,
}: MoveToTeamDialogProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadTeams();
      setSelectedTeamId(undefined);
      setSearch('');
    }
  }, [open]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        // Filter out the current team if screenplay is already in one
        const filtered = currentTeamId
          ? data.filter((t: Team) => t.id !== currentTeamId)
          : data;
        setTeams(filtered);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedTeamId === undefined) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeamId }),
      });

      if (response.ok) {
        const action = selectedTeamId ? 'moved to team' : 'made personal';
        toast.success(`Screenplay ${action}`);
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to move screenplay');
      }
    } catch (error) {
      console.error('Error moving screenplay:', error);
      toast.error('Failed to move screenplay');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Team</DialogTitle>
          <DialogDescription>
            Choose a team for &ldquo;{screenplayTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="search-input-icon" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Team list */}
        <ScrollArea className="h-[280px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="spinner" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Make Personal option */}
              {currentTeamId && (
                <button
                  onClick={() => setSelectedTeamId(null)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    selectedTeamId === null
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Make Personal</p>
                    <p className="text-xs text-muted-foreground">
                      Remove from team
                    </p>
                  </div>
                </button>
              )}

              {filteredTeams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No teams match your search' : 'No teams available'}
                  </p>
                </div>
              ) : (
                filteredTeams.map((team) => {
                  const teamColor = getTeamColor(team.id);
                  const RoleIcon = roleIcons[team.members?.[0]?.role as keyof typeof roleIcons] || UserIcon;

                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                        selectedTeamId === team.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      )}
                    >
                      {/* Team logo */}
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 overflow-hidden"
                        style={{ backgroundColor: team.logo ? undefined : `${teamColor}15` }}
                      >
                        {team.logo ? (
                          <img src={team.logo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Logo size={18} color={teamColor} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{team.name}</p>
                        <div className="meta-text">
                          <RoleIcon className="h-3 w-3" />
                          <span>{team._count?.members || 0} members</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedTeamId === undefined || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedTeamId === null ? 'Make Personal' : 'Move'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
