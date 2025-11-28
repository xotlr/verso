'use client'

import { cn } from '@/lib/utils'

interface ProfileStatsProps {
  projectCount: number
  scriptCount: number
  className?: string
}

export function ProfileStats({
  projectCount,
  scriptCount,
  className,
}: ProfileStatsProps) {
  return (
    <div className={cn('flex gap-5', className)}>
      <span className="flex items-baseline gap-1 hover:underline decoration-muted-foreground/50 underline-offset-2 cursor-pointer">
        <strong className="font-bold text-foreground">{projectCount}</strong>
        <span className="text-sm text-muted-foreground">Projects</span>
      </span>
      <span className="flex items-baseline gap-1 hover:underline decoration-muted-foreground/50 underline-offset-2 cursor-pointer">
        <strong className="font-bold text-foreground">{scriptCount}</strong>
        <span className="text-sm text-muted-foreground">Scripts</span>
      </span>
    </div>
  )
}
