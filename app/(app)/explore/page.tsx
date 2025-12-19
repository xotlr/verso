'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Users, Briefcase } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { ActivityCarousel } from '@/components/browse/activity-carousel';
import { ProfileCard, ProfileCardSkeleton } from '@/components/browse/profile-card';
import { ProjectCard, ProjectCardSkeleton } from '@/components/browse/project-card';
import { RoleNeedCard, RoleNeedCardSkeleton } from '@/components/browse/role-need-card';
import { ApplyRoleDialog } from '@/components/apply-role-dialog';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar } from '@/components/ui/list-page-toolbar';
import { cn } from '@/lib/utils';

// Types
interface PublicScreenplay {
  id: string;
  title: string;
  synopsis: string | null;
  genre: string | null;
  views: number;
  publishedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
  banner: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
  _count: {
    projects: number;
    screenplays: number;
  };
}

interface PublicProject {
  id: string;
  name: string;
  description: string | null;
  banner: string | null;
  logo: string | null;
  status: string;
  publishedAt: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  roles: Array<{
    id: string;
    role: string;
    name: string;
    user?: { id: string; image: string | null } | null;
  }>;
  _count: {
    screenplays: number;
  };
}

interface PublicRoleNeed {
  id: string;
  role: string;
  description: string | null;
  location: string | null;
  isPaid: boolean;
  createdAt: string;
  project: {
    id: string;
    name: string;
    banner: string | null;
    logo: string | null;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
  _count: {
    applications: number;
  };
  hasApplied?: boolean;
  applicationStatus?: string | null;
}

type TabType = 'scripts' | 'people' | 'projects' | 'roles';

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance',
  'Sci-Fi', 'Thriller', 'Documentary', 'Animation', 'Other',
];

const ROLE_TYPES = [
  { value: 'director', label: 'Director' },
  { value: 'writer', label: 'Writer' },
  { value: 'producer', label: 'Producer' },
  { value: 'executive_producer', label: 'Exec. Producer' },
  { value: 'cinematographer', label: 'Cinematographer' },
  { value: 'editor', label: 'Editor' },
  { value: 'composer', label: 'Composer' },
  { value: 'sound_designer', label: 'Sound Designer' },
  { value: 'production_designer', label: 'Production Designer' },
  { value: 'costume_designer', label: 'Costume Designer' },
  { value: 'casting_director', label: 'Casting Director' },
  { value: 'first_ad', label: '1st AD' },
  { value: 'line_producer', label: 'Line Producer' },
  { value: 'actor', label: 'Actor' },
  { value: 'gaffer', label: 'Gaffer' },
  { value: 'grip', label: 'Grip' },
  { value: 'other', label: 'Other' },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabType>('scripts');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<string>('all');

  // Scripts state
  const [screenplays, setScreenplays] = useState<PublicScreenplay[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [scriptsHasMore, setScriptsHasMore] = useState(false);
  const [scriptsTotal, setScriptsTotal] = useState(0);

  // People state
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersHasMore, setUsersHasMore] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsHasMore, setProjectsHasMore] = useState(false);

  // Roles state
  const [roleNeeds, setRoleNeeds] = useState<PublicRoleNeed[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesHasMore, setRolesHasMore] = useState(false);
  const [rolesTotal, setRolesTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Apply dialog state
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedRoleNeed, setSelectedRoleNeed] = useState<PublicRoleNeed | null>(null);

  // Fetch screenplays
  const fetchScreenplays = useCallback(async (reset = false) => {
    try {
      setScriptsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (genre && genre !== 'all') params.set('genre', genre);
      if (!reset) params.set('offset', screenplays.length.toString());

      const response = await fetch(`/api/explore?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setScreenplays(data.screenplays);
        } else {
          setScreenplays((prev) => [...prev, ...data.screenplays]);
        }
        setScriptsHasMore(data.hasMore);
        setScriptsTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching screenplays:', error);
    } finally {
      setScriptsLoading(false);
    }
  }, [search, genre, screenplays.length]);

  // Fetch users
  const fetchUsers = useCallback(async (reset = false) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (!reset) params.set('offset', users.length.toString());

      const response = await fetch(`/api/explore/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setUsersHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [search, users.length]);

  // Fetch projects
  const fetchProjects = useCallback(async (reset = false) => {
    try {
      setProjectsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (!reset) params.set('offset', projects.length.toString());

      const response = await fetch(`/api/explore/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setProjects(data.projects);
        } else {
          setProjects((prev) => [...prev, ...data.projects]);
        }
        setProjectsHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  }, [search, projects.length]);

  // Fetch role needs
  const fetchRoleNeeds = useCallback(async (reset = false) => {
    try {
      setRolesLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
      if (!reset) params.set('offset', roleNeeds.length.toString());

      const response = await fetch(`/api/explore/roles?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setRoleNeeds(data.roleNeeds);
        } else {
          setRoleNeeds((prev) => [...prev, ...data.roleNeeds]);
        }
        setRolesHasMore(data.hasMore);
        setRolesTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching role needs:', error);
    } finally {
      setRolesLoading(false);
    }
  }, [search, roleFilter, roleNeeds.length]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'scripts') {
      fetchScreenplays(true);
    } else if (activeTab === 'people') {
      if (users.length === 0) fetchUsers(true);
    } else if (activeTab === 'projects') {
      if (projects.length === 0) fetchProjects(true);
    } else if (activeTab === 'roles') {
      if (roleNeeds.length === 0) fetchRoleNeeds(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refetch on search/filter change
  useEffect(() => {
    if (activeTab === 'scripts') {
      fetchScreenplays(true);
    } else if (activeTab === 'people') {
      fetchUsers(true);
    } else if (activeTab === 'projects') {
      fetchProjects(true);
    } else if (activeTab === 'roles') {
      fetchRoleNeeds(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genre, roleFilter]);

  const handleLoadMore = () => {
    if (activeTab === 'scripts') fetchScreenplays(false);
    else if (activeTab === 'people') fetchUsers(false);
    else if (activeTab === 'projects') fetchProjects(false);
    else if (activeTab === 'roles') fetchRoleNeeds(false);
  };

  const isLoading = activeTab === 'scripts' ? scriptsLoading :
    activeTab === 'people' ? usersLoading :
    activeTab === 'projects' ? projectsLoading : rolesLoading;

  const hasMore = activeTab === 'scripts' ? scriptsHasMore :
    activeTab === 'people' ? usersHasMore :
    activeTab === 'projects' ? projectsHasMore : rolesHasMore;

  // Get description based on active tab
  const getDescription = () => {
    if (activeTab === 'scripts') {
      return `${scriptsTotal} public script${scriptsTotal !== 1 ? 's' : ''}${search || genre !== 'all' ? ' (filtered)' : ''}`;
    }
    if (activeTab === 'people') {
      return `${users.length} creator${users.length !== 1 ? 's' : ''}${search ? ' (filtered)' : ''}`;
    }
    if (activeTab === 'projects') {
      return `${projects.length} project${projects.length !== 1 ? 's' : ''}${search ? ' (filtered)' : ''}`;
    }
    return `${rolesTotal} open role${rolesTotal !== 1 ? 's' : ''}${search || roleFilter !== 'all' ? ' (filtered)' : ''}`;
  };

  return (
    <PageLayout
      title="Explore"
      description={getDescription()}
    >
      {/* Activity Carousel */}
      <ActivityCarousel className="mb-6 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 border-b border-border/50" />

      {/* Tabs, Search, and Filters */}
      <ListPageToolbar
        tabs={{
          items: [
            { value: 'scripts', label: 'Scripts', icon: <PiFilmScript className="h-4 w-4" />, count: scriptsTotal },
            { value: 'people', label: 'People', icon: <Users className="h-4 w-4" />, count: users.length },
            { value: 'projects', label: 'Projects', icon: <RiFolder6Line className="h-4 w-4" />, count: projects.length },
            { value: 'roles', label: 'Jobs', icon: <Briefcase className="h-4 w-4" />, count: rolesTotal },
          ],
          value: activeTab,
          onChange: (v) => setActiveTab(v as TabType),
        }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: activeTab === 'scripts' ? 'Search scripts...' :
            activeTab === 'people' ? 'Search people...' :
            activeTab === 'projects' ? 'Search projects...' : 'Search roles...',
        }}
        filters={
          activeTab === 'scripts' ? (
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : activeTab === 'roles' ? (
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Role Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLE_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
        className="mb-6"
      />

      {/* Content Grid */}
      {activeTab === 'scripts' && (
        scriptsLoading && screenplays.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : screenplays.length === 0 ? (
          <ExploreEmptyState
            icon={<PiFilmScript className="h-8 w-8 text-muted-foreground" />}
            title={search || genre !== 'all' ? 'No scripts found' : 'No public scripts yet'}
            description={search || genre !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Publish your screenplay to share it with the community. Go to your screenplay settings and toggle "Make Public".'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {screenplays.map((screenplay) => (
              <ScreenplayCard key={screenplay.id} screenplay={screenplay} />
            ))}
          </div>
        )
      )}

      {activeTab === 'people' && (
        usersLoading && users.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProfileCardSkeleton key={i} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <ExploreEmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No people found"
            description={search ? 'Try a different search term' : 'No public profiles yet'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {users.map((user) => (
              <ProfileCard key={user.id} user={user} />
            ))}
          </div>
        )
      )}

      {activeTab === 'projects' && (
        projectsLoading && projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <ExploreEmptyState
            icon={<RiFolder6Line className="h-8 w-8 text-muted-foreground" />}
            title="No projects found"
            description={search ? 'Try a different search term' : 'No public projects yet'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )
      )}

      {activeTab === 'roles' && (
        rolesLoading && roleNeeds.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <RoleNeedCardSkeleton key={i} />
            ))}
          </div>
        ) : roleNeeds.length === 0 ? (
          <ExploreEmptyState
            icon={<Briefcase className="h-8 w-8 text-muted-foreground" />}
            title={search || roleFilter !== 'all' ? 'No roles found' : 'No open roles yet'}
            description={search || roleFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'When projects post open roles, they will appear here.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {roleNeeds.map((roleNeed) => (
              <RoleNeedCard
                key={roleNeed.id}
                roleNeed={roleNeed}
                onApplyClick={() => {
                  setSelectedRoleNeed(roleNeed);
                  setApplyDialogOpen(true);
                }}
              />
            ))}
          </div>
        )
      )}

      {/* Apply Role Dialog */}
      <ApplyRoleDialog
        roleNeed={selectedRoleNeed}
        open={applyDialogOpen}
        onOpenChange={setApplyDialogOpen}
        onApplicationSubmitted={() => {
          // Refresh the list to show updated hasApplied status
          fetchRoleNeeds(true);
        }}
      />

      {/* Load More */}
      {hasMore && !isLoading && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </PageLayout>
  );
}

// Screenplay Card Component
function ScreenplayCard({ screenplay }: { screenplay: PublicScreenplay }) {
  return (
    <Link
      href={`/read/${screenplay.id}`}
      className={cn(
        'group block',
        'bg-card rounded-xl border border-border/60',
        'hover:border-border hover:shadow-md',
        'transition-all duration-200',
        'touch-manipulation'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {screenplay.title}
          </h3>
          {screenplay.genre && (
            <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">
              {screenplay.genre}
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
          {screenplay.synopsis || 'No synopsis available'}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
              <AvatarImage src={screenplay.user.image || undefined} />
              <AvatarFallback
                className="text-[10px] sm:text-xs text-white font-medium"
                style={getSimpleGradientStyle(screenplay.user.id)}
              >
                {screenplay.user.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[60px] sm:max-w-[100px]">
              {screenplay.user.name || 'Anonymous'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {screenplay.views}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty State Component for Explore page
function ExploreEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <div className="text-muted-foreground mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
