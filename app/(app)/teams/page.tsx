'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar } from '@/components/ui/list-page-toolbar';
import { useViewMode } from '@/hooks/use-view-mode';
import { Plus, Users, Settings } from 'lucide-react';
import { CreateTeamDialog } from '@/components/team/create-team-dialog';
import { TeamSettingsDialog, type TeamData } from '@/components/team/team-settings-dialog';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Team {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  ownerId: string;
  _count: {
    members: number;
    projects: number;
  };
}

// Generate a consistent color for a team based on its ID
function getTeamColor(teamId: string): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ];
  const hash = teamId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function TeamsPage() {
  const router = useRouter();
  const { data: teams, error, mutate } = useSWR<Team[]>('/api/teams', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useViewMode('teams');
  const [isCreating, setIsCreating] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);
  const [settingsTeamData, setSettingsTeamData] = useState<TeamData | null>(null);

  // Fetch full team data when settings are opened
  React.useEffect(() => {
    if (settingsTeamId) {
      fetch(`/api/teams/${settingsTeamId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => setSettingsTeamData(data))
        .catch(() => setSettingsTeamData(null));
    } else {
      setSettingsTeamData(null);
    }
  }, [settingsTeamId]);

  // Filter teams by search query
  const filteredTeams = teams?.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const isLoading = !teams && !error;

  if (error) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="Failed to load teams"
          description="There was an error loading your teams. Please try again."
        />
      </PageLayout>
    );
  }

  return (
    <>
      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={isCreating}
        onOpenChange={setIsCreating}
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
              mutate();
            }
          }}
          onUpdate={() => mutate()}
        />
      )}

      <PageLayout
        title="Teams"
        description={`${filteredTeams.length} team${filteredTeams.length !== 1 ? 's' : ''}${searchQuery ? ' (filtered)' : ''}`}
        actions={
          <Button onClick={() => setIsCreating(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Team</span>
          </Button>
        }
      >
        {/* Search */}
        <ListPageToolbar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: 'Search teams...',
          }}
          viewMode={{
            value: viewMode,
            onChange: setViewMode,
          }}
          className="mb-6"
        />

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6 text-muted-foreground" />}
            title={searchQuery ? 'No teams found' : 'No teams yet'}
            description={searchQuery
              ? 'Try a different search term'
              : 'Create a team to collaborate with others on screenplays and projects.'}
            action={!searchQuery ? {
              label: 'Create Team',
              onClick: () => setIsCreating(true),
              icon: <Plus className="h-5 w-5" />,
            } : undefined}
          />
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          )}>
            {filteredTeams.map((team) => {
              const teamColor = getTeamColor(team.id);
              return (
                <div
                  key={team.id}
                  className={cn(
                    "group relative rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                    viewMode === 'grid' ? "p-4" : "p-3 flex items-center gap-4"
                  )}
                  onClick={() => router.push(`/teams/${team.id}`)}
                >
                  {/* Team logo/icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-lg shrink-0 overflow-hidden",
                      viewMode === 'grid' ? "h-12 w-12 mb-3" : "h-10 w-10"
                    )}
                    style={{ backgroundColor: team.logo ? undefined : `${teamColor}15` }}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Logo size={viewMode === 'grid' ? 28 : 24} color={teamColor} />
                    )}
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team._count.members} member{team._count.members !== 1 ? 's' : ''} · {team._count.projects} project{team._count.projects !== 1 ? 's' : ''}
                    </p>
                    {viewMode === 'grid' && team.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>

                  {/* Settings button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSettingsTeamId(team.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                    aria-label={`${team.name} settings`}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PageLayout>
    </>
  );
}
