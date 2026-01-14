'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Users,
  Mail,
  CreditCard,
  History,
} from 'lucide-react';
import { TeamAuditLog } from '../team-audit-log';
import { GeneralTab } from './GeneralTab';
import { MembersTab } from './MembersTab';
import { InvitesTab } from './InvitesTab';
import { BillingTab } from './BillingTab';
import { TeamSettingsDialogProps, TeamMember, TeamInvite } from './types';

export function TeamSettingsDialog({
  team,
  open,
  onOpenChange,
  onUpdate,
}: TeamSettingsDialogProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('general');

  // Members state
  const [members, setMembers] = useState<TeamMember[]>(team.members);

  // Invites state
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const isOwner = session?.user?.id === team.ownerId;
  const currentMember = members.find((m) => m.user.id === session?.user?.id);
  const isAdmin = currentMember?.role === 'ADMIN' || isOwner;

  // Fetch invites when opening dialog
  useEffect(() => {
    if (open && isAdmin) {
      fetchInvites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin]);

  const fetchInvites = async () => {
    setIsLoadingInvites(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/invites`);
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const seatsUsed = members.length + invites.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Team Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="invites" className="gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Invites</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab
                team={team}
                isAdmin={isAdmin}
                isOwner={isOwner}
                userId={session?.user?.id}
                onUpdate={onUpdate}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="members">
              <MembersTab
                teamId={team.id}
                members={members}
                maxSeats={team.maxSeats}
                invitesCount={invites.length}
                isOwner={isOwner}
                currentUserId={session?.user?.id}
                onMembersChange={setMembers}
              />
            </TabsContent>

            <TabsContent value="invites">
              <InvitesTab
                teamId={team.id}
                invites={invites}
                isLoading={isLoadingInvites}
                onInvitesChange={setInvites}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {isAdmin ? (
                <TeamAuditLog teamId={team.id} />
              ) : (
                <div className="text-center py-12">
                  <History className="icon-large" />
                  <p className="text-sm text-muted-foreground">
                    Only admins can view activity logs
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="billing">
              <BillingTab
                teamId={team.id}
                maxSeats={team.maxSeats}
                seatsUsed={seatsUsed}
                isOwner={isOwner}
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
