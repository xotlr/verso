'use client'

import { Twitter, Linkedin, Film } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileSocialLinksProps {
  twitter?: string | null
  linkedin?: string | null
  imdb?: string | null
  className?: string
}

export function ProfileSocialLinks({
  twitter,
  linkedin,
  imdb,
  className,
}: ProfileSocialLinksProps) {
  if (!twitter && !linkedin && !imdb) {
    return null
  }

  return (
    <div className={cn('flex gap-3', className)}>
      {twitter && (
        <a
          href={`https://twitter.com/${twitter.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Twitter"
        >
          <Twitter className="h-5 w-5" />
        </a>
      )}
      {linkedin && (
        <a
          href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          title="LinkedIn"
        >
          <Linkedin className="h-5 w-5" />
        </a>
      )}
      {imdb && (
        <a
          href={imdb.startsWith('http') ? imdb : `https://imdb.com/name/${imdb}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          title="IMDb"
        >
          <Film className="h-5 w-5" />
        </a>
      )}
    </div>
  )
}
