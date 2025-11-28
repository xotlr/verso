'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Eye,
  Calendar,
  Share2,
} from 'lucide-react';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { formatDistanceToNow } from 'date-fns';

interface PublicScreenplay {
  id: string;
  title: string;
  content: string;
  synopsis: string | null;
  genre: string | null;
  views: number;
  publishedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
}

export default function ReadPage() {
  const params = useParams();
  const router = useRouter();
  const screenplayId = params.id as string;

  const [screenplay, setScreenplay] = useState<PublicScreenplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScreenplay = async () => {
      try {
        const response = await fetch(`/api/explore/${screenplayId}`);
        if (response.ok) {
          const data = await response.json();
          setScreenplay(data);
        } else if (response.status === 404) {
          setError('Screenplay not found or not publicly available');
        } else {
          setError('Failed to load screenplay');
        }
      } catch (err) {
        console.error('Error fetching screenplay:', err);
        setError('Failed to load screenplay');
      } finally {
        setIsLoading(false);
      }
    };

    if (screenplayId) {
      fetchScreenplay();
    }
  }, [screenplayId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: screenplay?.title,
          text: screenplay?.synopsis || `Read ${screenplay?.title}`,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Could show a toast here
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !screenplay) {
    return (
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/explore')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Explore
          </Button>
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">
              {error || 'Screenplay not found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              This screenplay may have been removed or made private.
            </p>
            <Button onClick={() => router.push('/explore')}>
              Browse other screenplays
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/explore')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Explore
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Title and Meta */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <h1 className="text-3xl font-bold text-foreground">{screenplay.title}</h1>
            {screenplay.genre && (
              <Badge variant="secondary">{screenplay.genre}</Badge>
            )}
          </div>

          {screenplay.synopsis && (
            <p className="text-muted-foreground mb-4">{screenplay.synopsis}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* Author */}
            <Link
              href={`/profile/${screenplay.user.id}`}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={screenplay.user.image || undefined} />
                <AvatarFallback
                  className="text-xs text-white font-medium"
                  style={getSimpleGradientStyle(screenplay.user.id)}
                >
                  {screenplay.user.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span>{screenplay.user.name || 'Anonymous'}</span>
            </Link>

            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Published {formatDistanceToNow(new Date(screenplay.publishedAt), { addSuffix: true })}
            </span>

            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {screenplay.views} view{screenplay.views !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Screenplay Content */}
        <div className="bg-card border border-border rounded-lg">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="p-8">
              <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {screenplay.content || 'No content available.'}
              </pre>
            </div>
          </ScrollArea>
        </div>

        {/* Author Bio */}
        {screenplay.user.bio && (
          <div className="mt-8 p-6 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">About the Author</h3>
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={screenplay.user.image || undefined} />
                <AvatarFallback
                  className="text-white font-medium"
                  style={getSimpleGradientStyle(screenplay.user.id)}
                >
                  {screenplay.user.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  href={`/profile/${screenplay.user.id}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {screenplay.user.name || 'Anonymous'}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  {screenplay.user.bio}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
