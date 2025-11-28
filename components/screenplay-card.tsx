'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreHorizontal,
  Edit3,
  Download,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';

export interface ScreenplayCardData {
  id: string;
  title: string;
  updatedAt: string;
  wordCount?: number;
  content?: string;
  project?: { id: string; name: string } | null;
}

interface ScreenplayCardProps {
  screenplay: ScreenplayCardData;
  onEdit?: (id: string) => void;
  onExport?: (screenplay: ScreenplayCardData) => void;
  onDelete?: (id: string) => void;
  onRemove?: (id: string) => void;
  removeLabel?: string;
}

export function ScreenplayCard({
  screenplay,
  onEdit,
  onExport,
  onDelete,
  onRemove,
  removeLabel = 'Remove',
}: ScreenplayCardProps) {
  const isValidDate = screenplay.updatedAt && !isNaN(new Date(screenplay.updatedAt).getTime());

  return (
    <div className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200">
      <Link href={`/editor/${screenplay.id}`}>
        <div className="p-5 cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                {screenplay.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {isValidDate
                    ? formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })
                    : 'Recently'}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(screenplay.id)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {onExport && (
                  <DropdownMenuItem onClick={() => onExport(screenplay)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onRemove(screenplay.id)}>
                      <X className="mr-2 h-4 w-4" />
                      {removeLabel}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(screenplay.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {(screenplay.wordCount ?? 0).toLocaleString()} words
              </Badge>
              {screenplay.project ? (
                <Badge variant="outline" className="text-xs">
                  {screenplay.project.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Standalone
                </Badge>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>
    </div>
  );
}
