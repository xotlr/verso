'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface InviteMemberDialogProps {
  teamId: string
  teamName: string
  seatsAvailable: number
  maxSeats: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSent?: () => void
}

export function InviteMemberDialog({
  teamId,
  teamName,
  seatsAvailable,
  maxSeats,
  open,
  onOpenChange,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (seatsAvailable <= 0) {
      setError('No seats available. Upgrade your plan to add more members.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'SEAT_LIMIT_REACHED') {
          setError('No seats available. Upgrade your plan to add more members.')
        } else {
          setError(data.error || 'Failed to send invite')
        }
        return
      }

      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setRole('MEMBER')
      onOpenChange(false)
      onInviteSent?.()
    } catch {
      setError('Failed to send invite. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail('')
      setRole('MEMBER')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to {teamName}
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join this team. They&apos;ll see a notification when they log in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'MEMBER')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">
                  <div className="flex flex-col items-start">
                    <span>Member</span>
                    <span className="text-xs text-muted-foreground">
                      Can view and edit team projects
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex flex-col items-start">
                    <span>Admin</span>
                    <span className="text-xs text-muted-foreground">
                      Can manage members and team settings
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="text-xs text-muted-foreground">
            {seatsAvailable > 0 ? (
              <>
                {seatsAvailable} seat{seatsAvailable !== 1 ? 's' : ''} available
                <span className="text-muted-foreground/70"> (of {maxSeats})</span>
              </>
            ) : (
              <span className="text-destructive">No seats available</span>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || seatsAvailable <= 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
