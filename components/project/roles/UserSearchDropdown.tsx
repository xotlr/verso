'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SearchUser } from './types'

interface UserSearchDropdownProps {
  users: SearchUser[]
  onSelect: (user: SearchUser) => void
}

export function UserSearchDropdown({ users, onSelect }: UserSearchDropdownProps) {
  if (users.length === 0) return null

  return (
    <ScrollArea className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px]">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
          onClick={() => onSelect(user)}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || undefined} className="object-cover" />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{user.name || user.email}</div>
            {user.name && (
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            )}
          </div>
        </button>
      ))}
    </ScrollArea>
  )
}
