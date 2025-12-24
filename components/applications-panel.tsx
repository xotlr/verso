'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Check,
  X,
  MapPin,
  Briefcase,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/ui/avatar-gradient';

interface Application {
  id: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    title: string | null;
    bio: string | null;
    location: string | null;
  };
}

interface RoleNeedInfo {
  id: string;
  role: string;
  description: string | null;
  projectId: string;
}

interface ApplicationsPanelProps {
  roleNeed: RoleNeedInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplicationUpdated?: () => void;
}

export function ApplicationsPanel({
  roleNeed,
  open,
  onOpenChange,
  onApplicationUpdated,
}: ApplicationsPanelProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && roleNeed) {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roleNeed]);

  const fetchApplications = async () => {
    if (!roleNeed) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${roleNeed.projectId}/role-needs/${roleNeed.id}/applications`
      );
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, status: 'ACCEPTED' | 'DECLINED') => {
    if (!roleNeed) return;

    setProcessingIds((prev) => new Set([...prev, appId]));
    try {
      const response = await fetch(
        `/api/projects/${roleNeed.projectId}/role-needs/${roleNeed.id}/applications/${appId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update application');
      }

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status } : app
        )
      );

      toast.success(
        status === 'ACCEPTED'
          ? 'Application accepted! They have been added to the project.'
          : 'Application declined.'
      );
      onApplicationUpdated?.();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update application');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  const pendingApplications = applications.filter((app) => app.status === 'PENDING');
  const processedApplications = applications.filter((app) => app.status !== 'PENDING');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Applications
          </SheetTitle>
          <SheetDescription>
            Review people interested in joining as {roleNeed?.role?.replace('_', ' ') || 'this role'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="mt-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <ApplicationSkeleton key={i} />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone expresses interest, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Pending Applications */}
              {pendingApplications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Pending ({pendingApplications.length})
                  </h3>
                  {pendingApplications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      isProcessing={processingIds.has(app.id)}
                      onAccept={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                      onDecline={() => handleUpdateStatus(app.id, 'DECLINED')}
                    />
                  ))}
                </div>
              )}

              {/* Processed Applications */}
              {processedApplications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Previously reviewed ({processedApplications.length})
                  </h3>
                  {processedApplications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      isProcessing={false}
                      showStatus
                    />
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ApplicationCard({
  application,
  isProcessing,
  onAccept,
  onDecline,
  showStatus,
}: {
  application: Application;
  isProcessing: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  showStatus?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* User Info */}
      <div className="flex items-start gap-3">
        <Link href={`/profile/${application.user.id}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={application.user.image || ''} />
            <AvatarFallback
              className="text-sm text-white font-medium"
              style={getSimpleGradientStyle(application.user.id)}
            >
              {application.user.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${application.user.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {application.user.name || 'Unknown'}
          </Link>
          {application.user.title && (
            <p className="text-sm text-muted-foreground truncate">
              {application.user.title}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {application.user.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {application.user.location}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {showStatus && (
          <Badge
            variant={application.status === 'ACCEPTED' ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              application.status === 'ACCEPTED' && 'bg-green-500 hover:bg-green-500',
              application.status === 'DECLINED' && 'bg-red-500/10 text-red-600'
            )}
          >
            {application.status === 'ACCEPTED' ? 'Accepted' : 'Declined'}
          </Badge>
        )}
      </div>

      {/* Message */}
      {application.message && (
        <div className="bg-muted/50 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <MessageSquare className="h-3 w-3" />
            Message
          </div>
          <p className="text-sm">{application.message}</p>
        </div>
      )}

      {/* Bio */}
      {application.user.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {application.user.bio}
        </p>
      )}

      {/* Actions */}
      {application.status === 'PENDING' && onAccept && onDecline && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Decline
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function ApplicationSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}
