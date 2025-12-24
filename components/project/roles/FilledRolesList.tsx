'use client'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { getRoleLabel } from './constants'
import type { GroupedMember } from './types'

interface FilledRolesListProps {
  members: GroupedMember[]
  currentUserId: string | undefined
  onDelete: (roleIds: string[]) => void
}

export function FilledRolesList({ members, currentUserId, onDelete }: FilledRolesListProps) {
  if (members.length === 0) return null

  return (
    <div className="border border-border rounded-lg divide-y divide-border">
      {members.map((member) => (
        <div
          key={member.userId}
          className="group flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.user?.image || undefined} className="object-cover" />
              <AvatarFallback className="text-sm font-medium bg-muted text-muted-foreground">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                {member.name}
                {member.userId === currentUserId && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {member.roles.map((r) => getRoleLabel(r)).join(', ')}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(member.roleIds)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
