'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Users, FolderOpen, Link as LinkIcon, Calendar } from 'lucide-react'

export interface TeamData {
  id: string
  name: string
  banner?: string | null
  logo?: string | null
  description?: string | null
  website?: string | null
  createdAt: Date | string
  owner?: {
    id: string
    name: string | null
    image: string | null
  }
  _count?: {
    members: number
    projects: number
  }
}

interface TeamHoverCardProps {
  team: TeamData
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function TeamHoverCard({
  team,
  children,
  side = 'bottom',
  align = 'start',
}: TeamHoverCardProps) {
  const initials = team.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const createdDate = new Date(team.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  const memberCount = team._count?.members ?? 0
  const projectCount = team._count?.projects ?? 0

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-80 p-0 overflow-hidden">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-accent/30 via-primary/20 to-accent/30 relative">
          {team.banner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.banner}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Logo overlapping banner */}
        <div className="px-4 -mt-8 relative">
          <Avatar className="h-16 w-16 border-4 border-card shadow-md rounded-xl">
            <AvatarImage src={team.logo || undefined} alt={team.name} />
            <AvatarFallback className="text-lg rounded-xl">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="p-4 pt-2 space-y-3">
          {/* Name */}
          <div>
            <h4 className="font-semibold text-foreground">{team.name}</h4>
            {team.owner && (
              <p className="text-sm text-muted-foreground">
                by {team.owner.name || 'Unknown'}
              </p>
            )}
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-foreground/80 line-clamp-2">
              {team.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {team.website && (
              <a
                href={team.website.startsWith('http') ? team.website : `https://${team.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <LinkIcon className="h-3 w-3" />
                {team.website.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {createdDate}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <strong className="text-foreground">{memberCount}</strong>{' '}
              <span className="text-muted-foreground">members</span>
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <strong className="text-foreground">{projectCount}</strong>{' '}
              <span className="text-muted-foreground">projects</span>
            </span>
          </div>

          {/* Action */}
          <Button asChild className="w-full" size="sm">
            <Link href={`/team/${team.id}`}>View Team</Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
