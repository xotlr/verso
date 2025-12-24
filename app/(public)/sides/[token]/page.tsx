'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Link2Off,
  FileText,
  User,
  Film,
} from 'lucide-react';
import { ReadOnlyScreenplayViewer } from '@/components/public/read-only-screenplay-viewer';

interface SidesData {
  title: string;
  screenplay: {
    title: string;
    author: string;
    content: object;
    type: string;
    format: string;
  };
  filterType: string;
  filterValue: string | null;
  expiresAt: string | null;
  callsheet?: {
    id: string;
    title: string;
    shootDate: string;
    callTime: string;
    primaryLocation: string | null;
  } | null;
  createdBy: string;
}

export default function PublicSidesViewerPage() {
  const params = useParams();
  const token = params.token as string;

  const [sidesData, setSidesData] = useState<SidesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; type: 'not_found' | 'expired' | 'revoked' | 'error' } | null>(null);
  const [scenesSheetOpen, setScenesSheetOpen] = useState(false);

  useEffect(() => {
    const fetchSides = async () => {
      try {
        const response = await fetch(`/api/sides/${token}`);

        if (response.ok) {
          const data = await response.json();
          setSidesData(data);
        } else if (response.status === 404) {
          setError({ message: 'Digital sides not found', type: 'not_found' });
        } else if (response.status === 410) {
          const data = await response.json();
          if (data.error?.includes('expired')) {
            setError({ message: 'This sides link has expired', type: 'expired' });
          } else {
            setError({ message: 'This sides link has been revoked', type: 'revoked' });
          }
        } else {
          setError({ message: 'Failed to load sides', type: 'error' });
        }
      } catch (err) {
        console.error('Error fetching sides:', err);
        setError({ message: 'Failed to load sides', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSides();
    }
  }, [token]);


  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-11 border-b border-border px-4 flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const Icon = error.type === 'expired' ? Clock : error.type === 'revoked' ? Link2Off : AlertTriangle;

    return (
      <div className="flex flex-col h-screen">
        <div className="h-11 border-b border-border px-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Digital Sides</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-2">{error.message}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {error.type === 'expired'
                ? 'The link you followed has expired. Please request a new link from the owner.'
                : error.type === 'revoked'
                ? 'This link has been revoked by the owner.'
                : 'Please check the link and try again.'}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!sidesData) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="h-auto min-h-11 border-b border-border px-4 py-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{sidesData.title}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 flex-wrap">
          {sidesData.filterType !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {sidesData.filterType === 'character' && <User className="h-3 w-3 mr-1" />}
              {sidesData.filterType === 'scenes' && <Film className="h-3 w-3 mr-1" />}
              {sidesData.filterValue || sidesData.filterType}
            </Badge>
          )}

          {sidesData.expiresAt && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Expires {formatDate(sidesData.expiresAt)}
            </Badge>
          )}
        </div>
      </div>

      {/* Callsheet Banner */}
      {sidesData.callsheet && (
        <div className="bg-muted/50 border-b border-border px-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{sidesData.callsheet.title}</span>
            <span className="text-muted-foreground">
              {formatDate(sidesData.callsheet.shootDate)}
            </span>
            <span className="text-muted-foreground">
              Call: {formatTime(sidesData.callsheet.callTime)}
            </span>
            {sidesData.callsheet.primaryLocation && (
              <span className="text-muted-foreground truncate">
                {sidesData.callsheet.primaryLocation}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Screenplay Content */}
      <div className="flex-1 overflow-hidden">
        <ReadOnlyScreenplayViewer
          content={JSON.stringify(sidesData.screenplay.content)}
          scenesSheetOpen={scenesSheetOpen}
          onScenesSheetOpenChange={setScenesSheetOpen}
        />
      </div>
    </div>
  );
}
