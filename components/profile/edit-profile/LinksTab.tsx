'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TabContentProps } from './types'

export function LinksTab({ formData, onChange }: TabContentProps) {
  return (
    <div className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => onChange('website', e.target.value)}
          placeholder="https://yoursite.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="twitter">Twitter / X</Label>
        <div className="flex">
          <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">@</span>
          <Input
            id="twitter"
            value={formData.twitter}
            onChange={(e) => onChange('twitter', e.target.value.replace('@', ''))}
            placeholder="username"
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn</Label>
        <div className="flex">
          <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">linkedin.com/in/</span>
          <Input
            id="linkedin"
            value={formData.linkedin}
            onChange={(e) => onChange('linkedin', e.target.value)}
            placeholder="username"
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="imdb">IMDb</Label>
        <div className="flex">
          <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">imdb.com/name/</span>
          <Input
            id="imdb"
            value={formData.imdb}
            onChange={(e) => onChange('imdb', e.target.value)}
            placeholder="nm1234567"
            className="rounded-l-none"
          />
        </div>
      </div>
    </div>
  )
}
