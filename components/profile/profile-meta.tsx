'use client'

import { MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileMetaProps {
  location?: string | null
  website?: string | null
  createdAt: Date | string
  size?: 'sm' | 'md'
  className?: string
}

export function ProfileMeta({
  location,
  website,
  createdAt,
  size = 'md',
  className,
}: ProfileMetaProps) {
  const joinDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: size === 'sm' ? 'short' : 'long',
    year: 'numeric',
  })

  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const gapClass = size === 'sm' ? 'gap-x-4 gap-y-1' : 'gap-x-6 gap-y-2'

  return (
    <div className={cn('flex flex-wrap', gapClass, textClass, 'text-muted-foreground', className)}>
      {location && (
        <span className="flex items-center gap-1.5">
          <MapPin className={iconClass} />
          {location}
        </span>
      )}
      {website && (
        <a
          href={website.startsWith('http') ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-primary hover:underline"
        >
          <LinkIcon className={iconClass} />
          {website.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )}
      <span className="flex items-center gap-1.5">
        <Calendar className={iconClass} />
        Joined {joinDate}
      </span>
    </div>
  )
}
