'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ProfileAvatarProps {
  userId: string
  imageUrl?: string | null
  name?: string | null
  email?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'h-5 w-5',               // 20px - bottom nav
  sm: 'h-10 w-10',             // 40px - hover cards
  md: 'h-24 w-24',             // 96px - mobile profile
  lg: 'h-32 w-32',             // 128px - desktop profile/settings
}

const borderClasses = {
  xs: 'border-0',
  sm: 'border-[3px]',          // thicker for mobile navbar
  md: 'border-[4px]',
  lg: 'border-[5px]',
}

const textClasses = {
  xs: 'text-[8px]',
  sm: 'text-sm',               // reduced for smaller size
  md: 'text-2xl',
  lg: 'text-3xl sm:text-4xl',
}

export function ProfileAvatar({
  userId: _userId,
  imageUrl,
  name,
  email,
  size = 'md',
  className,
}: ProfileAvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : email?.[0]?.toUpperCase() || '?'

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        borderClasses[size],
        'border-background shadow-lg ring-1 ring-black/5 rounded-full',
        className
      )}
    >
      <AvatarImage
        src={imageUrl || undefined}
        alt={name || ''}
        className="object-cover rounded-full"
      />
      <AvatarFallback
        className={cn(textClasses[size], 'font-semibold rounded-full bg-muted text-muted-foreground')}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
