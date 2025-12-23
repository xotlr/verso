'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2, Import } from 'lucide-react'
import { toast } from 'sonner'
import type { Credit } from '@/types/profile'
import type { TabContentProps } from './types'

interface WorkTabProps extends TabContentProps {
  credits: Credit[]
  onCreditsChange: (credits: Credit[]) => void
}

export function WorkTab({
  formData,
  onChange,
  user,
  credits,
  onCreditsChange,
}: WorkTabProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [newCredit, setNewCredit] = useState({ title: '', role: '', year: new Date().getFullYear() })

  const addCredit = async () => {
    if (!newCredit.title || !newCredit.role) return

    try {
      const response = await fetch(`/api/users/${user.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredit),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to add credit')
        return
      }

      const credit = await response.json()
      onCreditsChange([...credits, credit])
      setNewCredit({ title: '', role: '', year: new Date().getFullYear() })
      toast.success('Credit added')
    } catch {
      toast.error('Failed to add credit')
    }
  }

  const removeCredit = async (creditId: string) => {
    try {
      const response = await fetch(`/api/users/${user.id}/credits/${creditId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Failed to remove credit')
        return
      }

      onCreditsChange(credits.filter((c) => c.id !== creditId))
      toast.success('Credit removed')
    } catch {
      toast.error('Failed to remove credit')
    }
  }

  const importCredits = async () => {
    setIsImporting(true)
    try {
      const response = await fetch(`/api/users/${user.id}/credits/import`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to import credits')
        return
      }

      if (data.imported > 0) {
        const creditsResponse = await fetch(`/api/users/${user.id}/credits`)
        if (creditsResponse.ok) {
          const updatedCredits = await creditsResponse.json()
          onCreditsChange(updatedCredits)
        }
        toast.success(data.message)
      } else {
        toast.info(data.message)
      }
    } catch {
      toast.error('Failed to import credits')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-2">
        <Label>Featured Project</Label>
        <Select
          value={formData.featuredProjectId || '__none__'}
          onValueChange={(value) => onChange('featuredProjectId', value === '__none__' ? '' : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your best project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {user.projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Pin one project to showcase.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Credits</Label>
            <p className="text-xs text-muted-foreground">Your work history (max 10)</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={importCredits}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Import className="h-4 w-4 mr-1.5" />
            )}
            Import from Verso
          </Button>
        </div>

        {credits.length > 0 && (
          <div className="space-y-1">
            {credits.map((credit) => (
              <div
                key={credit.id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
              >
                <span className="text-sm">
                  <span className="font-medium">{credit.title}</span>
                  <span className="text-muted-foreground"> ({credit.year}) - {credit.role}</span>
                  {!credit.isManual && (
                    <Badge variant="outline" className="ml-2 text-[10px]">Verso</Badge>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => removeCredit(credit.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {credits.length < 10 && (
          <div className="flex gap-2">
            <Input
              value={newCredit.title}
              onChange={(e) => setNewCredit((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              className="flex-1"
            />
            <Input
              value={newCredit.role}
              onChange={(e) => setNewCredit((p) => ({ ...p, role: e.target.value }))}
              placeholder="Role"
              className="w-28"
            />
            <Input
              type="number"
              value={newCredit.year}
              onChange={(e) => setNewCredit((p) => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))}
              className="w-20"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addCredit}
              disabled={!newCredit.title || !newCredit.role}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Replay Showcase</Label>
        <Select
          value={formData.showcaseTimelapse || '__none__'}
          onValueChange={(value) => onChange('showcaseTimelapse', value === '__none__' ? '' : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a screenplay timelapse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {user.screenplays?.filter((s) => s.timelapseShareId).map((screenplay) => (
              <SelectItem key={screenplay.id} value={screenplay.timelapseShareId!}>
                {screenplay.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          60-second replay of your writing process. The Procreate flex.
        </p>
      </div>
    </div>
  )
}
