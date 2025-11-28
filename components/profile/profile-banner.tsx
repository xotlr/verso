'use client'

import { getMeshGradientStyle } from '@/lib/avatar-gradient'
import { cn } from '@/lib/utils'

interface ProfileBannerProps {
  userId: string
  bannerUrl?: string | null
  height?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  className?: string
}

const heightClasses = {
  sm: 'h-24',      // 96px - hover card
  md: 'h-48',      // 192px - mobile profile
  lg: 'h-48 md:h-52', // 192px mobile, 208px desktop - profile page
}

export function ProfileBanner({
  userId,
  bannerUrl,
  height = 'md',
  rounded = false,
  className,
}: ProfileBannerProps) {
  return (
    <div
      className={cn(
        'relative w-full',
        heightClasses[height],
        rounded && 'rounded-t-2xl overflow-hidden',
        className
      )}
      style={bannerUrl ? undefined : getMeshGradientStyle(userId)}
    >
      {bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
    </div>
  )
}
