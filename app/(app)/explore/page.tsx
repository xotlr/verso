'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Eye,
  Film,
  Compass,
  Users,
  Folder,
  FileText,
} from 'lucide-react';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { ActivityCarousel } from '@/components/browse/activity-carousel';
import { UserCard, UserCardSkeleton } from '@/components/browse/user-card';
import { ProjectCard, ProjectCardSkeleton } from '@/components/browse/project-card';
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
  publishedAt: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    screenplays: number;
  };
}

type TabType = 'scripts' | 'people' | 'projects';

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance',
  'Sci-Fi', 'Thriller', 'Documentary', 'Animation', 'Other',
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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'scripts') {
      fetchScreenplays(true);
    } else if (activeTab === 'people') {
      if (users.length === 0) fetchUsers(true);
    } else if (activeTab === 'projects') {
      if (projects.length === 0) fetchProjects(true);
    }
  }, [activeTab]);

  // Refetch on search/filter change
  useEffect(() => {
    if (activeTab === 'scripts') {
      fetchScreenplays(true);
    } else if (activeTab === 'people') {
      fetchUsers(true);
    } else if (activeTab === 'projects') {
      fetchProjects(true);
    }
  }, [search, genre]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleLoadMore = () => {
    if (activeTab === 'scripts') fetchScreenplays(false);
    else if (activeTab === 'people') fetchUsers(false);
    else if (activeTab === 'projects') fetchProjects(false);
  };

  const isLoading = activeTab === 'scripts' ? scriptsLoading :
    activeTab === 'people' ? usersLoading : projectsLoading;

  const hasMore = activeTab === 'scripts' ? scriptsHasMore :
    activeTab === 'people' ? usersHasMore : projectsHasMore;

  return (
    <main className="flex-1 overflow-auto bg-background pb-20 md:pb-0">
      {/* Activity Carousel */}
      <ActivityCarousel className="border-b border-border/50" />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="w-full justify-start gap-1 h-12 bg-transparent p-0">
              <TabsTrigger
                value="scripts"
                className="flex-1 sm:flex-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Scripts</span>
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="flex-1 sm:flex-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">People</span>
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="flex-1 sm:flex-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12"
              >
                <Folder className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Projects</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === 'scripts' ? 'Search scripts...' :
                  activeTab === 'people' ? 'Search people...' :
                  'Search projects...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          {activeTab === 'scripts' && (
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Scripts Tab */}
        {activeTab === 'scripts' && (
          <>
            {!scriptsLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {scriptsTotal} script{scriptsTotal !== 1 ? 's' : ''} found
              </p>
            )}
            {scriptsLoading && screenplays.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : screenplays.length === 0 ? (
              <EmptyState
                icon={<Film className="h-12 w-12" />}
                title="No scripts found"
                description={search || genre !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to publish a screenplay!'}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {screenplays.map((screenplay) => (
                  <ScreenplayCard key={screenplay.id} screenplay={screenplay} />
                ))}
              </div>
            )}
          </>
        )}

        {/* People Tab */}
        {activeTab === 'people' && (
          <>
            {usersLoading && users.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <UserCardSkeleton key={i} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No people found"
                description={search ? 'Try a different search term' : 'No public profiles yet'}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {users.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <>
            {projectsLoading && projects.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ProjectCardSkeleton key={i} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Folder className="h-12 w-12" />}
                title="No projects found"
                description={search ? 'Try a different search term' : 'No public projects yet'}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </main>
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

// Empty State Component
function EmptyState({
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
