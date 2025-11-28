'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
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
import {
  Search,
  Eye,
  Film,
  User,
  Compass,
} from 'lucide-react';

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

const GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Documentary',
  'Animation',
  'Other',
];

export default function ExplorePage() {
  const [screenplays, setScreenplays] = useState<PublicScreenplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<string>('all');
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchScreenplays = async (reset = false) => {
    try {
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
        setHasMore(data.hasMore);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching screenplays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchScreenplays(true);
  }, [search, genre]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchScreenplays(true);
  };

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Explore</h1>
          </div>
          <p className="text-muted-foreground">
            Discover screenplays shared by the community
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search screenplays..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {total} screenplay{total !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : screenplays.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No screenplays found</h3>
            <p className="text-muted-foreground">
              {search || genre !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to publish a screenplay!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {screenplays.map((screenplay) => (
                <Link
                  key={screenplay.id}
                  href={`/read/${screenplay.id}`}
                  className="group bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {screenplay.title}
                      </h3>
                      {screenplay.genre && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {screenplay.genre}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {screenplay.synopsis || 'No synopsis available'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={screenplay.user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {screenplay.user.name?.charAt(0) || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {screenplay.user.name || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {screenplay.views}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(screenplay.publishedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchScreenplays(false)}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
