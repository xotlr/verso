'use client'

import { cn } from '@/lib/utils'
import type { RoleDefinition } from './types'

interface RoleSuggestionsDropdownProps {
  suggestions: RoleDefinition[]
  selectedIndex: number
  onSelect: (role: RoleDefinition) => void
  onHover: (index: number) => void
}

export function RoleSuggestionsDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
}: RoleSuggestionsDropdownProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-auto">
      {suggestions.map((role, index) => {
        const Icon = role.icon
        const isSelected = index === selectedIndex
        return (
          <button
            key={role.value}
            type="button"
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left text-sm',
              isSelected ? 'bg-accent' : 'hover:bg-muted'
            )}
            onClick={() => onSelect(role)}
            onMouseEnter={() => onHover(index)}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{role.label}</span>
            {isSelected && <span className="ml-auto text-xs text-muted-foreground">↵</span>}
          </button>
        )
      })}
    </div>
  )
}
