'use client'

import { Button } from '@/components/ui/button'
import { Clock, Mail, Copy, Check, X } from 'lucide-react'
import { getRoleIcon, getRoleLabel } from './constants'
import type { PendingInvite } from './types'

interface PendingInvitesListProps {
  invites: PendingInvite[]
  copiedToken: string | null
  onCopyLink: (token: string) => void
  onRevoke: (inviteId: string) => void
}

export function PendingInvitesList({
  invites,
  copiedToken,
  onCopyLink,
  onRevoke,
}: PendingInvitesListProps) {
  if (invites.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Pending Invites
      </h4>
      <div className="border border-dashed border-border rounded-lg divide-y divide-dashed divide-border">
        {invites.map((invite) => {
          const Icon = getRoleIcon(invite.role)
          return (
            <div key={invite.id} className="group flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-sm">{invite.email}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {getRoleLabel(invite.role)}
                    <span className="ml-1">· pending</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onCopyLink(invite.token)}
                >
                  {copiedToken === invite.token ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRevoke(invite.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
