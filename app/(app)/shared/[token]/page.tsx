'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Pencil,
  AlertTriangle,
  Clock,
  Link2Off,
  FileText,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Permission = 'VIEW' | 'COMMENT' | 'EDIT';

interface SharedScreenplay {
  id: string;
  title: string;
  content: string;
  synopsis: string | null;
  type: string;
  format: string;
  genre: string | null;
  logline: string | null;
  author: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ShareData {
  screenplay: SharedScreenplay;
  permission: Permission;
  expiresAt: string | null;
}

const PERMISSION_BADGE: Record<Permission, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  VIEW: {
    label: 'View Only',
    icon: <Eye className="h-3 w-3" />,
    variant: 'secondary',
  },
  COMMENT: {
    label: 'Can Comment',
    icon: <MessageSquare className="h-3 w-3" />,
    variant: 'secondary',
  },
  EDIT: {
    label: 'Can Edit',
    icon: <Pencil className="h-3 w-3" />,
    variant: 'default',
  },
};

export default function SharedViewerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; type: 'not_found' | 'expired' | 'revoked' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSharedScreenplay = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);

        if (response.ok) {
          const data = await response.json();
          setShareData(data);
        } else if (response.status === 404) {
          setError({ message: 'Share link not found', type: 'not_found' });
        } else if (response.status === 410) {
          const data = await response.json();
          if (data.error?.includes('expired')) {
            setError({ message: 'This share link has expired', type: 'expired' });
          } else {
            setError({ message: 'This share link has been revoked', type: 'revoked' });
          }
        } else {
          setError({ message: 'Failed to load screenplay', type: 'error' });
        }
      } catch (err) {
        console.error('Error fetching shared screenplay:', err);
        setError({ message: 'Failed to load screenplay', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSharedScreenplay();
    }
  }, [token]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData?.screenplay.title,
          text: shareData?.screenplay.synopsis || `Read ${shareData?.screenplay.title}`,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
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

  if (error) {
    const errorIcon = {
      not_found: <Link2Off className="h-12 w-12 text-muted-foreground" />,
      expired: <Clock className="h-12 w-12 text-orange-500" />,
      revoked: <Link2Off className="h-12 w-12 text-red-500" />,
      error: <AlertTriangle className="h-12 w-12 text-red-500" />,
    };

    return (
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              {errorIcon[error.type]}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {error.message}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {error.type === 'expired' && 'The owner can share the screenplay again with a new link.'}
              {error.type === 'revoked' && 'The owner has revoked access to this screenplay.'}
              {error.type === 'not_found' && 'This link may be invalid or the screenplay has been deleted.'}
              {error.type === 'error' && 'Please try again later.'}
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!shareData) {
    return null;
  }

  const { screenplay, permission, expiresAt } = shareData;
  const permissionInfo = PERMISSION_BADGE[permission];

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Badge variant={permissionInfo.variant} className="flex items-center gap-1">
              {permissionInfo.icon}
              {permissionInfo.label}
            </Badge>
            {expiresAt && (
              <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Expires {new Date(expiresAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Title and Meta */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground mt-1" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">{screenplay.title}</h1>
              <p className="text-muted-foreground">by {screenplay.author}</p>
            </div>
          </div>

          {screenplay.logline && (
            <p className="text-muted-foreground mb-4 italic">&quot;{screenplay.logline}&quot;</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {screenplay.genre && (
              <Badge variant="secondary">{screenplay.genre}</Badge>
            )}
            <Badge variant="outline">
              {screenplay.type === 'FILM' ? 'Film' : screenplay.type === 'TV' ? 'TV' : screenplay.type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {screenplay.wordCount.toLocaleString()} words
            </span>
          </div>
        </div>

        {/* Synopsis */}
        {screenplay.synopsis && (
          <div className="mb-8 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold mb-2">Synopsis</h3>
            <p className="text-muted-foreground">{screenplay.synopsis}</p>
          </div>
        )}

        {/* Screenplay Content */}
        <div className="bg-card border border-border rounded-lg">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="p-8">
              <pre className={cn(
                "font-mono text-sm whitespace-pre-wrap leading-relaxed",
                permission === 'VIEW' && "select-text"
              )}>
                {screenplay.content || 'No content available.'}
              </pre>
            </div>
          </ScrollArea>
        </div>

        {/* Permission notice */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {permission === 'VIEW' && 'You have view-only access to this screenplay.'}
          {permission === 'COMMENT' && 'You can view this screenplay and add comments.'}
          {permission === 'EDIT' && 'You have full editing access to this screenplay.'}
        </div>
      </div>
    </main>
  );
}
