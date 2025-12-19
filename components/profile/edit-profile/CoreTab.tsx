'use client'

import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROFILE_ROLES, AVAILABILITY_CONFIG, type Availability } from '@/types/profile'
import type { TabContentProps, ProfileFormData } from './types'

interface CoreTabProps extends TabContentProps {
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  usernameError: string | null
  onUsernameChange: (value: string) => void
}

export function CoreTab({
  formData,
  onChange,
  usernameStatus,
  usernameError,
  onUsernameChange,
}: CoreTabProps) {
  const toggleRole = (role: string) => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter((r) => r !== role)
      : formData.roles.length < 5 ? [...formData.roles, role] : formData.roles
    onChange('roles', newRoles)
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="username"
              className={cn(
                'pl-7 pr-9',
                usernameStatus === 'available' && 'border-green-500/60',
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && 'border-red-500/60'
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="oneLiner">One-liner</Label>
        <Input
          id="oneLiner"
          value={formData.oneLiner}
          onChange={(e) => onChange('oneLiner', e.target.value.slice(0, 100))}
          placeholder="Screenwriter. Horror. Vienna."
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">
          {formData.oneLiner.length}/100 - Forces clarity. No paragraphs.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => onChange('location', e.target.value)}
          placeholder="Los Angeles, CA"
        />
        <p className="text-xs text-muted-foreground">City-level. Critical for local production.</p>
      </div>

      <div className="space-y-2">
        <Label>Roles</Label>
        <p className="text-xs text-muted-foreground">
          Select up to 5 ({formData.roles.length}/5)
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFILE_ROLES.map((role) => (
            <label
              key={role.value}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors',
                formData.roles.includes(role.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              )}
            >
              <Checkbox
                checked={formData.roles.includes(role.value)}
                onCheckedChange={() => toggleRole(role.value)}
                className="hidden"
              />
              <span className="text-sm">{role.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reelUrl">Reel / Portfolio</Label>
        <Input
          id="reelUrl"
          type="url"
          value={formData.reelUrl}
          onChange={(e) => onChange('reelUrl', e.target.value)}
          placeholder="https://vimeo.com/..."
        />
        <p className="text-xs text-muted-foreground">One primary link. Vimeo, YouTube, or website.</p>
      </div>

      <div className="space-y-2">
        <Label>Availability</Label>
        <div className="flex gap-2">
          {(Object.keys(AVAILABILITY_CONFIG) as Availability[]).map((status) => {
            const config = AVAILABILITY_CONFIG[status]
            return (
              <button
                key={status}
                type="button"
                onClick={() => onChange('availability', status)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border transition-colors',
                  formData.availability === status
                    ? `${config.borderColor} bg-${config.color}/10`
                    : 'border-border hover:bg-muted'
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                <span className="text-sm">{config.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
