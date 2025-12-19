'use client'

import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/image-upload'
import type { TabContentProps } from './types'

export function ImagesTab({ formData, onChange, userId }: TabContentProps) {
  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-2">
        <Label>Banner Image</Label>
        <ImageUpload
          value={formData.banner || undefined}
          onChange={(url) => onChange('banner', url || '')}
          bucket="banners"
          userId={userId}
          aspectRatio="banner"
          placeholder="Drop a banner image (3:1 ratio)"
        />
      </div>

      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <div className="flex items-start gap-4">
          <ImageUpload
            value={formData.image || undefined}
            onChange={(url) => onChange('image', url || '')}
            bucket="avatars"
            userId={userId}
            aspectRatio="square"
            className="w-32"
            placeholder="Upload avatar"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Square image. Shows on profile and hover cards.
          </p>
        </div>
      </div>
    </div>
  )
}
