"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from '@/components/providers/auth-provider';
import {
  Settings,
  LogOut,
  Sparkles,
  CreditCard,
  User,
  Users,
  Mail,
  Crown,
} from "lucide-react";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PendingInvitesDialog } from "@/components/pending-invites-dialog";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { usePendingInvites } from "@/hooks/use-pending-invites";
import type { PlanType } from "@/lib/stripe";

// Plan display order for upgrade suggestions
const PLAN_ORDER: PlanType[] = ['FREE', 'PLUS', 'PRO', 'MAX'];

function getNextPlan(currentPlan: PlanType): PlanType | null {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[currentIndex + 1];
}

interface UserAvatarMenuProps {
  className?: string;
}

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
  const { data: session } = useSession();
  const user = session?.user;

  // Current plan
  const currentPlan = (user?.plan as PlanType) || 'FREE';
  const nextPlan = getNextPlan(currentPlan);
  const isPaidPlan = currentPlan !== 'FREE';

  // Pending invites
  const { count: inviteCount } = usePendingInvites();

  // Dialog states
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-header-button=""
            className={cn(
              "relative flex items-center justify-center h-8 w-8 rounded-md",
              "hover:bg-accent",
              "transition-colors active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              className
            )}
          >
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || "User"}
                className="object-cover rounded-md"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium rounded-md">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {inviteCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                {inviteCount > 9 ? '9+' : inviteCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuLabel className="px-3 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">{user.name || "User"}</p>
                  {isPaidPlan && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] font-medium shrink-0">
                      {currentPlan}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/profile/${session?.user?.id}`} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/connections" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Connections
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInvitesOpen(true)} className="cursor-pointer">
              <Mail className="mr-2 h-4 w-4" />
              Invitations
              {inviteCount > 0 && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                  {inviteCount}
                </Badge>
              )}
            </DropdownMenuItem>
            {nextPlan && (
              <DropdownMenuItem onClick={() => setUpgradeOpen(true)} className="cursor-pointer">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to {nextPlan.charAt(0) + nextPlan.slice(1).toLowerCase()}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings?tab=billing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <PendingInvitesDialog
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
      />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </>
  );
}
