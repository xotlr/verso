'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';
import { getSimpleGradientStyle } from '@/lib/ui/avatar-gradient';
import { toast } from 'sonner';

interface InviteBannerProps<T> {
  /** API endpoint to fetch invites from */
  fetchUrl: string;
  /** Function to build the accept URL for a given invite */
  acceptUrl: (item: T) => string;
  /** HTTP method for accepting (default: 'POST') */
  acceptMethod?: 'POST' | 'PUT';
  /** Function to build the decline URL for a given invite */
  declineUrl: (item: T) => string;
  /** HTTP method for declining (default: 'DELETE') */
  declineMethod?: 'DELETE' | 'POST';
  /** Get the avatar info for the invite */
  getAvatar: (item: T) => { src?: string | null; fallbackId: string; fallbackText: string };
  /** Render the title line */
  renderTitle: (item: T) => React.ReactNode;
  /** Render the subtitle line */
  renderSubtitle: (item: T) => React.ReactNode;
  /** Render optional badges/metadata between subtitle and buttons */
  renderBadges?: (item: T) => React.ReactNode;
  /** Success message when accepting */
  acceptSuccessMessage: (item: T) => string;
  /** Success message when declining */
  declineSuccessMessage?: string;
  /** Callback when an invite is accepted */
  onAcceptSuccess?: (item: T) => void;
  /** Unique key extractor */
  getKey: (item: T) => string;
}

export function InviteBanner<T>({
  fetchUrl,
  acceptUrl,
  acceptMethod = 'POST',
  declineUrl,
  declineMethod = 'DELETE',
  getAvatar,
  renderTitle,
  renderSubtitle,
  renderBadges,
  acceptSuccessMessage,
  declineSuccessMessage = 'Invite declined',
  onAcceptSuccess,
  getKey,
}: InviteBannerProps<T>) {
  const [invites, setInvites] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await fetch(fetchUrl);
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleAccept = async (invite: T) => {
    const key = getKey(invite);
    setProcessingInvite(key);
    try {
      const response = await fetch(acceptUrl(invite), {
        method: acceptMethod,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invite');
      }

      toast.success(acceptSuccessMessage(invite));
      setInvites((prev) => prev.filter((i) => getKey(i) !== key));
      onAcceptSuccess?.(invite);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDecline = async (invite: T) => {
    const key = getKey(invite);
    setProcessingInvite(key);
    try {
      const response = await fetch(declineUrl(invite), {
        method: declineMethod,
      });

      if (!response.ok) {
        throw new Error('Failed to decline invite');
      }

      toast.success(declineSuccessMessage);
      setInvites((prev) => prev.filter((i) => getKey(i) !== key));
    } catch {
      toast.error('Failed to decline invite');
    } finally {
      setProcessingInvite(null);
    }
  };

  if (isLoading || invites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const key = getKey(invite);
        const avatar = getAvatar(invite);
        const isProcessing = processingInvite === key;

        return (
          <Card key={key} className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={avatar.src || undefined} className="rounded-lg" />
                <AvatarFallback
                  className="rounded-lg text-white font-semibold"
                  style={getSimpleGradientStyle(avatar.fallbackId)}
                >
                  {avatar.fallbackText}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{renderTitle(invite)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {renderSubtitle(invite)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleDecline(invite)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {renderBadges && (
                  <div className="flex items-center gap-2 mt-3">
                    {renderBadges(invite)}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invite)}
                    disabled={isProcessing}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
