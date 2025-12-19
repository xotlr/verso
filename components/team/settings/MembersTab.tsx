'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Crown, Shield, User as UserIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TeamMember, roleLabels } from './types';

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: UserIcon,
};

interface MembersTabProps {
  teamId: string;
  members: TeamMember[];
  maxSeats: number;
  invitesCount: number;
  isOwner: boolean;
  currentUserId: string | undefined;
  onMembersChange: (members: TeamMember[]) => void;
}

export function MembersTab({
  teamId,
  members,
  maxSeats,
  invitesCount,
  isOwner,
  currentUserId,
  onMembersChange,
}: MembersTabProps) {
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const seatsUsed = members.length + invitesCount;

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    setIsUpdatingRole(memberId);
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      onMembersChange(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success('Member role updated');
    } catch {
      toast.error('Failed to update member role');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      onMembersChange(members.filter((m) => m.id !== memberId));
      toast.success('Member removed from team');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''} ({seatsUsed}/{maxSeats} seats used)
        </p>
      </div>
      <div className="space-y-3">
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role];
          const isSelf = member.user.id === currentUserId;
          const canManage = isOwner && member.role !== 'OWNER';

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback
                    className="text-white font-medium"
                    style={getSimpleGradientStyle(member.user.id)}
                  >
                    {member.user.name?.[0]?.toUpperCase() || member.user.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {member.user.name || 'Anonymous'}
                    {isSelf && (
                      <span className="text-muted-foreground ml-1">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.role === 'OWNER' ? (
                  <Badge variant="secondary" className="gap-1">
                    <RoleIcon className="h-3 w-3" />
                    Owner
                  </Badge>
                ) : canManage ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleRoleChange(member.id, value as 'ADMIN' | 'MEMBER')
                      }
                      disabled={isUpdatingRole === member.id}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {member.user.name || member.user.email} from the team.
                            They will lose access to all team projects.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <RoleIcon className="h-3 w-3" />
                    {roleLabels[member.role]}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
