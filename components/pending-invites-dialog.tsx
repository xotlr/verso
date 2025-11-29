'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Check, X } from 'lucide-react'
import { usePendingInvites } from '@/hooks/use-pending-invites'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'
import { toast } from 'sonner'
import { useTeam } from '@/contexts/team-context'

interface PendingInvitesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PendingInvitesDialog({ open, onOpenChange }: PendingInvitesDialogProps) {
  const { invites, isLoading, acceptInvite, declineInvite } = usePendingInvites()
  const { refreshTeams } = useTeam()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleAccept = async (token: string, teamName: string) => {
    setProcessingId(token)
    const success = await acceptInvite(token)
    if (success) {
      toast.success(`Joined ${teamName}!`)
      await refreshTeams()
      if (invites.length <= 1) {
        onOpenChange(false)
      }
    } else {
      toast.error('Failed to accept invite. It may have expired.')
    }
    setProcessingId(null)
  }

  const handleDecline = async (token: string) => {
    setProcessingId(token)
    const success = await declineInvite(token)
    if (success) {
      toast.success('Invite declined')
    } else {
      toast.error('Failed to decline invite')
    }
    setProcessingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Team Invitations
          </DialogTitle>
          <DialogDescription>
            You&apos;ve been invited to join the following teams
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => {
                const isProcessing = processingId === invite.token

                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={invite.team.logo || undefined} />
                        <AvatarFallback
                          className="text-white font-medium"
                          style={getSimpleGradientStyle(invite.team.id)}
                        >
                          {invite.team.name[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{invite.team.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            by {invite.inviter.name || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {invite.role === 'ADMIN' ? 'Admin' : 'Member'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDecline(invite.token)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleAccept(invite.token, invite.team.name)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
