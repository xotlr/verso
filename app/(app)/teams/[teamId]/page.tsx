'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { PageLayout } from '@/components/layouts/page-layout';
import { Settings, Plus, FileText, FolderOpen, ChevronLeft, Users } from 'lucide-react';
import { TeamSettingsDialog, type TeamData } from '@/components/team/team-settings-dialog';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { ScreenplayListCard, ScreenplayListCardSkeleton } from '@/components/screenplay/screenplay-list-card';
import { ProjectFolderCard, ProjectFolderCardSkeleton } from '@/components/project/project-folder-card';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  ownerId: string;
  members: Array<{
    id: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  _count: {
    members: number;
    projects: number;
  };
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

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const { data: team, error: teamError, mutate: mutateTeam } = useSWR<TeamDetail>(
    `/api/teams/${teamId}`,
    fetcher
  );

  const { data: screenplaysData, error: screenplaysError, mutate: mutateScreenplays } = useSWR(
    team ? `/api/screenplays?teamId=${teamId}` : null,
    fetcher
  );

  const { data: projectsData, error: projectsError, mutate: mutateProjects } = useSWR(
    team ? `/api/projects?teamId=${teamId}` : null,
    fetcher
  );

  const [activeTab, setActiveTab] = useState('screenplays');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const screenplays = screenplaysData?.screenplays || [];
  const projects = projectsData || [];

  const isLoading = !team && !teamError;

  if (teamError) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          title="Team not found"
          description="This team doesn't exist or you don't have access to it."
          action={{
            label: 'Back to Teams',
            onClick: () => router.push('/teams'),
          }}
        />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  const teamColor = getTeamColor(teamId);

  return (
    <>
      {/* Team Settings Dialog */}
      {team && settingsOpen && (
        <TeamSettingsDialog
          team={{
            ...team,
            website: null,
            maxSeats: 5,
          } as TeamData}
          open={settingsOpen}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            if (!open) {
              mutateTeam();
            }
          }}
          onUpdate={() => mutateTeam()}
        />
      )}

      <PageLayout
        title={
          <div className="flex items-center gap-3">
            <Link
              href="/teams"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 overflow-hidden"
              style={{ backgroundColor: team?.logo ? undefined : `${teamColor}15` }}
            >
              {team?.logo ? (
                <img src={team.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Logo size={24} color={teamColor} />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold">{team?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {team?._count.members} member{team?._count.members !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="screenplays" className="gap-2">
              <FileText className="h-4 w-4" />
              Screenplays
              {screenplays.length > 0 && (
                <span className="text-xs text-muted-foreground">({screenplays.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
              {projects.length > 0 && (
                <span className="text-xs text-muted-foreground">({projects.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screenplays" className="mt-6">
            {screenplaysError ? (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="Failed to load screenplays"
                description="There was an error loading this team's screenplays."
              />
            ) : !screenplaysData ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <ScreenplayListCardSkeleton key={i} />
                ))}
              </div>
            ) : screenplays.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-muted-foreground" />}
                title="No screenplays yet"
                description="This team doesn't have any screenplays yet."
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {screenplays.map((screenplay: any) => (
                  <ScreenplayListCard
                    key={screenplay.id}
                    screenplay={screenplay}
                    href={`/screenplay/${screenplay.id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            {projectsError ? (
              <EmptyState
                icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
                title="Failed to load projects"
                description="There was an error loading this team's projects."
              />
            ) : !projectsData ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <ProjectFolderCardSkeleton key={i} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
                title="No projects yet"
                description="This team doesn't have any projects yet."
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project: any) => (
                  <ProjectFolderCard
                    key={project.id}
                    project={project}
                    onOpen={() => router.push(`/project/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
