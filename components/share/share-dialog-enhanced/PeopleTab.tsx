'use client'

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
import { Badge } from '@/components/ui/badge'
import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { UserSearch } from '../user-search'
import { Loader2, Trash2, Mail, Crown } from 'lucide-react'
import type { ShareRole, ShareUser, Share, PendingInvite } from './types'
import { ROLE_INFO } from './types'

interface PeopleTabProps {
  owner: ShareUser | null
  shares: Share[]
  pendingInvites: PendingInvite[]
  selectedRole: ShareRole
  emailInput: string
  isLoadingShares: boolean
  isSavingShare: boolean
  existingUserIds: string[]
  onRoleChange: (role: ShareRole) => void
  onEmailChange: (email: string) => void
  onUserSelect: (user: ShareUser) => void
  onEmailInvite: () => void
  onUpdateRole: (shareId: string, role: ShareRole) => void
  onRemoveShare: (shareId: string) => void
}

export function PeopleTab({
  owner,
  shares,
  pendingInvites,
  selectedRole,
  emailInput,
  isLoadingShares,
  isSavingShare,
  existingUserIds,
  onRoleChange,
  onEmailChange,
  onUserSelect,
  onEmailInvite,
  onUpdateRole,
  onRemoveShare,
}: PeopleTabProps) {
  return (
    <div className="space-y-4">
      {/* Add people section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <UserSearch
              onSelect={onUserSelect}
              excludeIds={existingUserIds}
              placeholder="Search users..."
            />
          </div>
          <Select value={selectedRole} onValueChange={(v) => onRoleChange(v as ShareRole)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_INFO) as ShareRole[]).map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    {ROLE_INFO[role].icon}
                    {ROLE_INFO[role].label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email invite */}
        <div className="flex gap-2">
          <Input
            type="email"
            value={emailInput}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Or invite by email..."
            onKeyDown={(e) => e.key === 'Enter' && onEmailInvite()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onEmailInvite}
            disabled={isSavingShare || !emailInput.trim()}
          >
            {isSavingShare ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* People with access */}
      <div className="border-t pt-4">
        <Label className="text-xs text-muted-foreground mb-3 block">People with access</Label>

        {isLoadingShares ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {/* Owner */}
            {owner && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <ProfileAvatar
                  userId={owner.id}
                  imageUrl={owner.image}
                  name={owner.name || 'Owner'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{owner.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Owner
                </Badge>
              </div>
            )}

            {/* Shares */}
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <ProfileAvatar
                  userId={share.user.id}
                  imageUrl={share.user.image}
                  name={share.user.name || 'User'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{share.user.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{share.user.email}</p>
                </div>
                <Select
                  value={share.role}
                  onValueChange={(v) => onUpdateRole(share.id, v as ShareRole)}
                >
                  <SelectTrigger className="w-[110px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_INFO) as ShareRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_INFO[role].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveShare(share.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Pending invites */}
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">Pending invite</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {ROLE_INFO[invite.role].label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveShare(invite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {shares.length === 0 && pendingInvites.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Not shared with anyone yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
