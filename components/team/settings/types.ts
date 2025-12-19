export interface TeamMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface TeamInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  expiresAt: string;
  inviter: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface TeamData {
  id: string;
  name: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  website: string | null;
  ownerId: string;
  maxSeats: number;
  members: TeamMember[];
  _count?: {
    members?: number;
    invites?: number;
  };
}

export interface TeamSettingsDialogProps {
  team: TeamData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const roleIcons = {
  OWNER: 'Crown',
  ADMIN: 'Shield',
  MEMBER: 'UserIcon',
} as const;

export const roleLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
} as const;
