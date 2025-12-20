'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Link2Off,
} from 'lucide-react';
import { PublicViewerHeader } from '@/components/public/public-viewer-header';
import { ReadOnlyScreenplayViewer } from '@/components/public/read-only-screenplay-viewer';
import { RequestAccessDialog } from '@/components/public/request-access-dialog';

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

export default function PublicSharedViewerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; type: 'not_found' | 'expired' | 'revoked' | 'error' } | null>(null);
  const [scenesSheetOpen, setScenesSheetOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

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

  const handleRequestAccess = useCallback(() => {
    setRequestDialogOpen(true);
  }, []);

  const handleOpenSceneNav = useCallback(() => {
    setScenesSheetOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        {/* Header skeleton */}
        <div className="h-11 border-b border-border px-4 flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 flex">
          <div className="hidden md:block w-64 border-r border-border p-4 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-[800px] w-full max-w-[816px] mx-auto" />
          </div>
        </div>
      </div>
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
      <div className="flex flex-col h-screen">
        <div className="h-11 border-b border-border px-4 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="flex justify-center mb-4">
              {errorIcon[error.type]}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {error.message}
            </h2>
            <p className="text-muted-foreground mb-6">
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
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  const { screenplay, permission, expiresAt } = shareData;

  return (
    <div className="flex flex-col h-screen">
      <PublicViewerHeader
        title={screenplay.title}
        author={screenplay.author}
        permission={permission}
        expiresAt={expiresAt}
        onRequestAccess={handleRequestAccess}
        onOpenSceneNav={handleOpenSceneNav}
      />

      <div className="flex-1 overflow-hidden">
        <ReadOnlyScreenplayViewer
          content={screenplay.content || ''}
          scenesSheetOpen={scenesSheetOpen}
          onScenesSheetOpenChange={setScenesSheetOpen}
        />
      </div>

      <RequestAccessDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        token={token}
        screenplayTitle={screenplay.title}
      />
    </div>
  );
}
