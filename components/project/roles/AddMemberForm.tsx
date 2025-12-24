'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Mail, Users, User, Send, UserPlus } from 'lucide-react'
import { ROLE_DEFINITIONS, isEmail } from './constants'
import { RoleSuggestionsDropdown } from './RoleSuggestionsDropdown'
import { UserSearchDropdown } from './UserSearchDropdown'
import type { SearchUser, RoleDefinition } from './types'

interface AddMemberFormProps {
  onAddRole: (options?: { userId?: string; name?: string; assignSelf?: boolean }) => Promise<void>
  onSendInvite: () => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  newRole: { role: string; name: string }
  setNewRole: React.Dispatch<React.SetStateAction<{ role: string; name: string }>>
  roleInput: string
  setRoleInput: React.Dispatch<React.SetStateAction<string>>
}

export function AddMemberForm({
  onAddRole,
  onSendInvite,
  onCancel,
  isSubmitting,
  newRole,
  setNewRole,
  roleInput,
  setRoleInput,
}: AddMemberFormProps) {
  const [roleSuggestions, setRoleSuggestions] = useState<RoleDefinition[]>([])
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const roleInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const roleSuggestionsRef = useRef<HTMLDivElement>(null)

  // Search users with debounce
  useEffect(() => {
    const query = newRole.name.trim()

    if (query.length < 2 || isEmail(query)) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const users = await res.json()
          setSearchResults(users)
          setShowDropdown(users.length > 0)
        }
      } catch (error) {
        console.error('Search failed:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [newRole.name])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (roleSuggestionsRef.current && !roleSuggestionsRef.current.contains(e.target as Node)) {
        setShowRoleSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter role suggestions as user types
  useEffect(() => {
    if (roleInput.trim()) {
      const filtered = ROLE_DEFINITIONS.filter(
        (r) =>
          r.label.toLowerCase().includes(roleInput.toLowerCase()) ||
          r.value.toLowerCase().includes(roleInput.toLowerCase())
      )
      setRoleSuggestions(filtered)
      setShowRoleSuggestions(filtered.length > 0)
      setSelectedSuggestionIndex(0)
    } else {
      setRoleSuggestions(ROLE_DEFINITIONS)
      setShowRoleSuggestions(false)
      setSelectedSuggestionIndex(0)
    }
  }, [roleInput])

  const selectUser = (user: SearchUser) => {
    onAddRole({ userId: user.id, name: user.name || user.email })
    setShowDropdown(false)
  }

  const selectRole = (role: RoleDefinition) => {
    setRoleInput(role.label)
    setNewRole((prev) => ({ ...prev, role: role.value }))
    setShowRoleSuggestions(false)
    inputRef.current?.focus()
  }

  const inputIsEmail = isEmail(newRole.name.trim())

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Role input with auto-suggestions */}
        <div className="relative w-full sm:w-[180px]" ref={roleSuggestionsRef}>
          <Input
            ref={roleInputRef}
            placeholder="Type role..."
            value={roleInput}
            onChange={(e) => {
              setRoleInput(e.target.value)
              setNewRole((prev) => ({
                ...prev,
                role: e.target.value.toLowerCase().replace(/\s+/g, '_'),
              }))
            }}
            onKeyDown={(e) => {
              if (showRoleSuggestions && roleSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedSuggestionIndex((prev) =>
                    prev < roleSuggestions.length - 1 ? prev + 1 : 0
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : roleSuggestions.length - 1
                  )
                } else if (e.key === 'Tab' || e.key === 'Enter') {
                  e.preventDefault()
                  selectRole(roleSuggestions[selectedSuggestionIndex])
                }
              }
              if (e.key === 'Escape') {
                setShowRoleSuggestions(false)
              }
            }}
            onFocus={() => {
              if (roleInput.trim() && roleSuggestions.length > 0) {
                setShowRoleSuggestions(true)
              }
            }}
            autoFocus
          />
          {showRoleSuggestions && (
            <RoleSuggestionsDropdown
              suggestions={roleSuggestions}
              selectedIndex={selectedSuggestionIndex}
              onSelect={selectRole}
              onHover={setSelectedSuggestionIndex}
            />
          )}
        </div>

        <div className="relative flex-1" ref={dropdownRef}>
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Search users or enter email..."
              value={newRole.name}
              onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
              className={cn(newRole.name.trim() && 'pr-8')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRole.role && newRole.name.trim()) {
                  e.preventDefault()
                  if (inputIsEmail) {
                    onSendInvite()
                  } else if (!showDropdown) {
                    onAddRole()
                  }
                }
                if (e.key === 'Escape') {
                  if (showDropdown) {
                    setShowDropdown(false)
                  } else {
                    onCancel()
                  }
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0 && !inputIsEmail) {
                  setShowDropdown(true)
                }
              }}
            />
            {newRole.name.trim() && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {inputIsEmail ? (
                  <Mail className="h-4 w-4 text-muted-foreground" />
                ) : searchResults.length > 0 ? (
                  <Users className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {showDropdown && (
            <UserSearchDropdown users={searchResults} onSelect={selectUser} />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3">
          {inputIsEmail ? (
            <Button
              size="sm"
              onClick={onSendInvite}
              disabled={isSubmitting || !newRole.role}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-1.5" />
                  Invite
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onAddRole()}
              disabled={isSubmitting || !newRole.role || !newRole.name.trim()}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                'Adding...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Add
                </>
              )}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {inputIsEmail
            ? 'Email detected - click Invite to send an invite link'
            : 'Search for existing users, enter an email to invite, or type a name'}
        </p>
        {newRole.role && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddRole({ assignSelf: true })}
            disabled={isSubmitting}
            className="gap-1.5 w-full sm:w-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign Myself
          </Button>
        )}
      </div>
    </div>
  )
}
