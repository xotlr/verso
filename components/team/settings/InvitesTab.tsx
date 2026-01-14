'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TeamInvite, roleLabels } from './types';

interface InvitesTabProps {
  teamId: string;
  invites: TeamInvite[];
  isLoading: boolean;
  onInvitesChange: (invites: TeamInvite[]) => void;
}

export function InvitesTab({
  teamId,
  invites,
  isLoading,
  onInvitesChange,
}: InvitesTabProps) {
  const [isRevokingInvite, setIsRevokingInvite] = useState<string | null>(null);

  const handleRevokeInvite = async (inviteId: string) => {
    setIsRevokingInvite(inviteId);
    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke invite');
      }

      onInvitesChange(invites.filter((i) => i.id !== inviteId));
      toast.success('Invite revoked');
    } catch {
      toast.error('Failed to revoke invite');
    } finally {
      setIsRevokingInvite(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 mt-4">
        <Loader2 className="spinner" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-8 mt-4">
        <Mail className="icon-large" />
        <p className="text-sm text-muted-foreground">No pending invites</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {invites.map((invite) => {
        const expiresAt = new Date(invite.expiresAt);
        const isExpired = expiresAt < new Date();
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return (
          <div
            key={invite.id}
            className="flex items-center justify-between p-3 rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{invite.email}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {roleLabels[invite.role]}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isExpired ? (
                      <span className="text-destructive">Expired</span>
                    ) : (
                      `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                    )}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRevokeInvite(invite.id)}
              disabled={isRevokingInvite === invite.id}
            >
              {isRevokingInvite === invite.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
