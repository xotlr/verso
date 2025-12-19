'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Credit } from '@/types/profile';

interface ProfileCreditsProps {
  credits: Credit[];
  className?: string;
}

export function ProfileCredits({ credits, className }: ProfileCreditsProps) {
  if (!credits || credits.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Credits
      </h3>
      <ul className="space-y-1">
        {credits.map((credit) => (
          <li key={credit.id} className="flex items-center text-sm">
            <span className="text-muted-foreground mr-1.5">-</span>
            {credit.projectId ? (
              <Link
                href={`/project/${credit.projectId}`}
                className="hover:underline flex items-center gap-1 group"
              >
                <span className="font-medium">{credit.title}</span>
                <span className="text-muted-foreground">
                  ({credit.year})
                </span>
                <span className="text-muted-foreground">-</span>
                <span>{credit.role}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                <span className="font-medium">{credit.title}</span>
                <span className="text-muted-foreground">
                  ({credit.year})
                </span>
                <span className="text-muted-foreground">-</span>
                <span>{credit.role}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
