'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layouts/page-layout';
import { ListPageToolbar, SORT_OPTIONS, FilterPill } from '@/components/ui/list-page-toolbar';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/hooks/use-view-mode';
import {
  Clock,
  FileText,
  Folder,
  Film,
  Eye,
  MessageSquare,
  Pencil,
  Shield,
  Users,
} from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';

// Types
type ShareRole = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'ADMIN';

interface SharedItem {
  id: string;
  shareId: string;
  shareRole: ShareRole;
  sharedAt: string;
  sharedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  updatedAt: string;
  // Screenplay fields
  title?: string;
  logline?: string | null;
  genre?: string | null;
  // Project fields
  name?: string;
  description?: string | null;
  status?: string;
  _count?: { screenplays: number };
  // Series fields
  format?: string | null;
  type: 'screenplay' | 'project' | 'series';
}

interface SharedData {
  screenplays: SharedItem[];
  projects: SharedItem[];
  series: SharedItem[];
}

const ROLE_INFO: Record<ShareRole, { label: string; icon: React.ReactNode; color: string }> = {
  VIEWER: { label: 'View', icon: <Eye className="h-3 w-3" />, color: 'bg-blue-500' },
  COMMENTER: { label: 'Comment', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-yellow-500' },
  EDITOR: { label: 'Edit', icon: <Pencil className="h-3 w-3" />, color: 'bg-green-500' },
  ADMIN: { label: 'Admin', icon: <Shield className="h-3 w-3" />, color: 'bg-purple-500' },
};

type TabValue = 'all' | 'screenplays' | 'projects' | 'series';

const TAB_FILTERS: { value: TabValue; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Users className="h-4 w-4" />, activeIcon: <Users className="h-4 w-4" /> },
  { value: 'screenplays', label: 'Screenplays', icon: <PiFilmScript className="h-4 w-4" />, activeIcon: <PiFilmScript className="h-4 w-4" /> },
  { value: 'projects', label: 'Projects', icon: <RiFolder6Line className="h-4 w-4" />, activeIcon: <RiFolder6Line className="h-4 w-4" /> },
  { value: 'series', label: 'Series', icon: <Film className="h-4 w-4" />, activeIcon: <Film className="h-4 w-4" /> },
];

function formatTimeCompact(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(date).toLocaleDateString();
}

export default function SharedWithMePage() {
  const router = useRouter();
  const [data, setData] = useState<SharedData>({ screenplays: [], projects: [], series: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [viewMode, setViewMode] = useViewMode('shared');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/shared-with-me');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading shared items:', error);
      toast.error('Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
  };

  const allItems = useMemo(() => {
    const items: SharedItem[] = [];

    if (activeTab === 'all' || activeTab === 'screenplays') {
      items.push(...data.screenplays);
    }
    if (activeTab === 'all' || activeTab === 'projects') {
      items.push(...data.projects);
    }
    if (activeTab === 'all' || activeTab === 'series') {
      items.push(...data.series);
    }

    return items
      .filter((item) => {
        const searchText = (item.title || item.name || '').toLowerCase();
        return searchText.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        }
        return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime();
      });
  }, [data, activeTab, searchQuery, sortBy]);

  const handleItemClick = (item: SharedItem) => {
    switch (item.type) {
      case 'screenplay':
        router.push(`/editor/${item.id}`);
        break;
      case 'project':
        router.push(`/project/${item.id}`);
        break;
      case 'series':
        router.push(`/series/${item.id}`);
        break;
    }
  };

  const totalCount = data.screenplays.length + data.projects.length + data.series.length;

  return (
    <PageLayout
      title="Shared with me"
      description={`${totalCount} item${totalCount !== 1 ? 's' : ''} shared with you`}
    >
      {/* Tab Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {TAB_FILTERS.map((tab) => {
          const count = tab.value === 'screenplays'
            ? data.screenplays.length
            : tab.value === 'projects'
              ? data.projects.length
              : tab.value === 'series'
                ? data.series.length
                : totalCount;
          const label = tab.value === 'all' ? tab.label : `${tab.label} (${count})`;
          return (
            <FilterPill
              key={tab.value}
              active={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              icon={activeTab === tab.value ? tab.activeIcon : tab.icon}
              label={label}
            />
          );
        })}
      </div>

      {/* Toolbar */}
      <ListPageToolbar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search shared items...',
        }}
        sort={{
          value: sortBy,
          onChange: (v) => setSortBy(v as typeof sortBy),
          options: [SORT_OPTIONS.recent, SORT_OPTIONS.name],
        }}
        viewMode={{
          value: viewMode,
          onChange: setViewMode,
        }}
        className="mb-6"
      />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title={searchQuery ? 'No items found' : 'Nothing shared with you yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'When someone shares a screenplay, project, or series with you, it will appear here'
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allItems.map((item) => (
            <SharedItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {allItems.map((item) => (
            <SharedItemRow key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}

// Grid card component
function SharedItemCard({ item, onClick }: { item: SharedItem; onClick: () => void }) {
  const roleInfo = ROLE_INFO[item.shareRole];
  const itemTitle = item.title || item.name || 'Untitled';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col p-4 rounded-xl bg-card border border-border',
        'hover:border-primary hover:shadow-md transition-all text-left w-full',
        'h-[160px]'
      )}
    >
      {/* Type icon */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {item.type === 'screenplay' && <FileText className="h-4 w-4 text-muted-foreground" />}
          {item.type === 'project' && <Folder className="h-4 w-4 text-muted-foreground" />}
          {item.type === 'series' && <Film className="h-4 w-4 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
        </div>
        <Badge variant="secondary" className="gap-1 text-xs">
          {roleInfo.icon}
          {roleInfo.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
        {itemTitle}
      </h3>

      {/* Description */}
      {(item.logline || item.description) && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {item.logline || item.description}
        </p>
      )}

      {/* Spacer */}
      <div className="flex-grow" />

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
        <div className="flex items-center gap-2">
          <ProfileAvatar
            userId={item.sharedBy.id}
            imageUrl={item.sharedBy.image}
            name={item.sharedBy.name || 'User'}
            size="xs"
          />
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {item.sharedBy.name || 'Unknown'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTimeCompact(new Date(item.sharedAt))}
        </div>
      </div>
    </button>
  );
}

// List row component
function SharedItemRow({ item, onClick }: { item: SharedItem; onClick: () => void }) {
  const roleInfo = ROLE_INFO[item.shareRole];
  const itemTitle = item.title || item.name || 'Untitled';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-4 p-4 rounded-lg bg-card border border-border w-full',
        'hover:border-primary hover:shadow-sm transition-all text-left'
      )}
    >
      {/* Type icon */}
      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
        {item.type === 'screenplay' && <FileText className="h-5 w-5 text-muted-foreground" />}
        {item.type === 'project' && <Folder className="h-5 w-5 text-muted-foreground" />}
        {item.type === 'series' && <Film className="h-5 w-5 text-muted-foreground" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {itemTitle}
          </h3>
          <Badge variant="outline" className="text-xs capitalize">
            {item.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ProfileAvatar
            userId={item.sharedBy.id}
            imageUrl={item.sharedBy.image}
            name={item.sharedBy.name || 'User'}
            size="xs"
          />
          <span className="text-xs text-muted-foreground">
            Shared by {item.sharedBy.name || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Badge variant="secondary" className="gap-1 text-xs">
          {roleInfo.icon}
          {roleInfo.label}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTimeCompact(new Date(item.sharedAt))}
        </div>
      </div>
    </button>
  );
}
