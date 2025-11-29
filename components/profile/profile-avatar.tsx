'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'
import { cn } from '@/lib/utils'

interface ProfileAvatarProps {
  userId: string
  imageUrl?: string | null
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-[72px] w-[72px]',     // 72px - hover card
  md: 'h-32 w-32',              // 128px - mobile profile
  lg: 'h-32 w-32 sm:h-[134px] sm:w-[134px]', // 128px mobile, 134px desktop
}

const borderClasses = {
  sm: 'border-[4px]',
  md: 'border-[5px]',
  lg: 'border-[5px]',
}

const textClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-3xl sm:text-4xl',
}

export function ProfileAvatar({
  userId,
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
        'border-card shadow-lg ring-1 ring-black/5 rounded-md',
        className
      )}
    >
      <AvatarImage
        src={imageUrl || undefined}
        alt={name || ''}
        className="object-cover rounded-md"
      />
      <AvatarFallback
        className={cn(textClasses[size], 'text-white font-semibold rounded-md')}
        style={getSimpleGradientStyle(userId)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
