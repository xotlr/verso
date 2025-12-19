'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { TabContentProps } from './types'

export function PrivacyTab({ formData, onChange }: TabContentProps) {
  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="public-profile">Public Profile</Label>
          <p className="text-sm text-muted-foreground">
            Allow others to view your profile
          </p>
        </div>
        <Switch
          id="public-profile"
          checked={formData.isPublic}
          onCheckedChange={(checked) => onChange('isPublic', checked)}
        />
      </div>
    </div>
  )
}
