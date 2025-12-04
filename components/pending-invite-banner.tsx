'use client';

import { InviteBanner } from '@/components/ui/invite-banner';
import { useTeam } from '@/contexts/team-context';
import { Users } from 'lucide-react';

interface TeamInvite {
  id: string;
  token: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  expiresAt: string;
  team: {
    id: string;
    name: string;
    logo: string | null;
    description: string | null;
    _count: { members: number };
  };
  inviter: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function PendingInviteBanner() {
  const { refreshTeams } = useTeam();

  return (
    <InviteBanner<TeamInvite>
      fetchUrl="/api/invites"
      acceptUrl={(invite) => `/api/invites/${invite.token}/accept`}
      declineUrl={(invite) => `/api/invites/${invite.token}/accept`}
      getKey={(invite) => invite.id}
      getAvatar={(invite) => ({
        src: invite.team.logo,
        fallbackId: invite.team.id,
        fallbackText: invite.team.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      })}
      renderTitle={(invite) => (
        <>
          You&apos;ve been invited to join{' '}
          <span className="text-primary">{invite.team.name}</span>
        </>
      )}
      renderSubtitle={(invite) => (
        <>
          Invited by {invite.inviter.name || 'someone'} as{' '}
          {invite.role === 'ADMIN' ? 'an Admin' : 'a Member'}
        </>
      )}
      renderBadges={(invite) => (
        <>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {invite.team._count?.members ?? 0} member
            {(invite.team._count?.members ?? 0) !== 1 ? 's' : ''}
          </div>
          {invite.team.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              &bull; {invite.team.description}
            </span>
          )}
        </>
      )}
      acceptSuccessMessage={(invite) => `Welcome to ${invite.team.name}!`}
      onAcceptSuccess={() => refreshTeams()}
    />
  );
}
