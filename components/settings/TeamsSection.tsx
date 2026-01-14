'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Settings, Crown, Shield, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/contexts/team-context';
import { CreateTeamDialog } from '@/components/team/create-team-dialog';
import { TeamSettingsDialog, type TeamData } from '@/components/team/team-settings-dialog';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

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

const roleLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
} as const;

export function TeamsSection() {
  const router = useRouter();
  const { teams, isLoading, refreshTeams } = useTeam();
  const [isCreating, setIsCreating] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);
  const [settingsTeamData, setSettingsTeamData] = useState<TeamData | null>(null);

  // Fetch full team data when settings are opened
  React.useEffect(() => {
    if (settingsTeamId) {
      fetch(`/api/teams/${settingsTeamId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            setSettingsTeamData({
              ...data,
              website: null,
              maxSeats: data.maxSeats || 5,
            });
          }
        })
        .catch(() => setSettingsTeamData(null));
    } else {
      setSettingsTeamData(null);
    }
  }, [settingsTeamId]);

  return (
    <div className="space-y-6">
      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={isCreating}
        onOpenChange={(open) => {
          setIsCreating(open);
          if (!open) refreshTeams();
        }}
      />

      {/* Team Settings Dialog */}
      {settingsTeamData && (
        <TeamSettingsDialog
          team={settingsTeamData}
          open={!!settingsTeamId}
          onOpenChange={(open) => {
            if (!open) {
              setSettingsTeamId(null);
              setSettingsTeamData(null);
              refreshTeams();
            }
          }}
          onUpdate={() => refreshTeams()}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Teams</h2>
          <p className="text-sm text-muted-foreground">
            Manage your teams and collaborations
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Teams List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Users className="icon-large" />
          <h3 className="font-medium mb-1">No teams yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a team to collaborate with others
          </p>
          <Button onClick={() => setIsCreating(true)} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first team
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => {
            const teamColor = getTeamColor(team.id);
            const RoleIcon = roleIcons[team.members?.[0]?.role as keyof typeof roleIcons] || UserIcon;
            const roleLabel = roleLabels[team.members?.[0]?.role as keyof typeof roleLabels] || 'Member';

            return (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Team logo */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden"
                    style={{ backgroundColor: team.logo ? undefined : `${teamColor}15` }}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Logo size={24} color={teamColor} />
                    )}
                  </div>

                  {/* Team info */}
                  <div>
                    <h3 className="font-medium">{team.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {roleLabel}
                      </span>
                      <span>•</span>
                      <span>{team._count?.members || 0} members</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/teams/${team.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsTeamId(team.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
