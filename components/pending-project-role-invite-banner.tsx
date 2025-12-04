'use client';

import { useRouter } from 'next/navigation';
import { InviteBanner } from '@/components/ui/invite-banner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Film,
  Clapperboard,
  PenTool,
  Megaphone,
  Camera,
  Scissors,
  Music,
  Palette,
  Users,
  Headphones,
  User,
  type LucideIcon,
} from 'lucide-react';

interface ProjectRoleInvite {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    logo: string | null;
    banner: string | null;
  };
  inviter: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// Role definitions matching ProjectRolesManager
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500' },
  { value: 'other', label: 'Other', icon: User, color: 'text-gray-500' },
];

function getRoleDef(roleValue: string) {
  return ROLE_DEFINITIONS.find((r) => r.value === roleValue) || {
    value: roleValue,
    label: roleValue,
    icon: User,
    color: 'text-gray-500',
  };
}

export function PendingProjectRoleInviteBanner() {
  const router = useRouter();

  return (
    <InviteBanner<ProjectRoleInvite>
      fetchUrl="/api/project-role-invites"
      acceptUrl={(invite) => `/api/project-role-invites/${invite.token}`}
      declineUrl={(invite) => `/api/project-role-invites/${invite.token}`}
      getKey={(invite) => invite.id}
      getAvatar={(invite) => ({
        src: invite.project.logo,
        fallbackId: invite.project.id,
        fallbackText: invite.project.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      })}
      renderTitle={(invite) => (
        <>
          You&apos;ve been invited to join{' '}
          <span className="text-primary">{invite.project.name}</span>
        </>
      )}
      renderSubtitle={(invite) => {
        const roleDef = getRoleDef(invite.role);
        const RoleIcon = roleDef.icon;
        return (
          <>
            Invited by {invite.inviter.name || 'someone'} as{' '}
            <span className={cn('inline-flex items-center gap-1', roleDef.color)}>
              <RoleIcon className="h-3 w-3" />
              {roleDef.label}
            </span>
          </>
        );
      }}
      renderBadges={(invite) => {
        const roleDef = getRoleDef(invite.role);
        const RoleIcon = roleDef.icon;
        return (
          <>
            <Badge variant="secondary" className="text-xs">
              <Film className="h-3 w-3 mr-1" />
              Project
            </Badge>
            <Badge variant="outline" className={cn('text-xs', roleDef.color)}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {roleDef.label}
            </Badge>
          </>
        );
      }}
      acceptSuccessMessage={(invite) => {
        const roleDef = getRoleDef(invite.role);
        return `You're now the ${roleDef.label} on ${invite.project.name}!`;
      }}
      onAcceptSuccess={(invite) => {
        router.push(`/project/${invite.project.id}`);
      }}
    />
  );
}
