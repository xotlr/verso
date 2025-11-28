'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import {
  ProfileBanner,
  ProfileAvatar,
  ProfileStats,
  ProfileMeta,
} from '@/components/profile'

export interface ProfileData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  banner?: string | null
  bio?: string | null
  title?: string | null
  location?: string | null
  website?: string | null
  createdAt: Date | string
  _count?: {
    projects: number
    screenplays: number
  }
}

interface ProfileHoverCardProps {
  user: ProfileData
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function ProfileHoverCard({
  user,
  children,
  side = 'bottom',
  align = 'start',
}: ProfileHoverCardProps) {
  const projectCount = user._count?.projects ?? 0
  const scriptCount = user._count?.screenplays ?? 0

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className="w-[320px] p-0 overflow-hidden rounded-2xl shadow-xl"
      >
        {/* Banner */}
        <ProfileBanner
          userId={user.id}
          bannerUrl={user.banner}
          height="sm"
        />

        {/* Avatar overlapping banner by ~50% */}
        <div className="px-4 -mt-9 relative">
          <ProfileAvatar
            userId={user.id}
            imageUrl={user.image}
            name={user.name}
            email={user.email}
            size="sm"
          />
        </div>

        {/* Content */}
        <div className="p-4 pt-3 space-y-3">
          {/* Name & Title */}
          <div>
            <h4 className="font-bold text-foreground text-[15px] leading-tight">
              {user.name || 'Anonymous'}
            </h4>
            {user.title && (
              <p className="text-sm text-muted-foreground leading-tight mt-0.5">
                {user.title}
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-foreground/90 leading-snug line-clamp-3">
              {user.bio}
            </p>
          )}

          {/* Meta info */}
          <ProfileMeta
            location={user.location}
            website={user.website}
            createdAt={user.createdAt}
            size="sm"
          />

          {/* Stats */}
          <ProfileStats
            projectCount={projectCount}
            scriptCount={scriptCount}
            className="text-sm"
          />

          {/* Action */}
          <Button asChild className="w-full rounded-full font-semibold" size="sm">
            <Link href={`/profile/${user.id}`}>View Profile</Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
