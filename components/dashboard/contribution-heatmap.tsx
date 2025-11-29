'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeatmapCell {
  date: string;
  wordCount: number;
  level: number; // 0-4
}

interface ContributionHeatmapProps {
  data: HeatmapCell[];
}

// Primary color palette - matches the word count chart
const levelColors = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary/80',
];

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  // Memoize week grouping for performance
  const weeks = useMemo(() => {
    const result: HeatmapCell[][] = [];
    for (let i = 0; i < data.length; i += 7) {
      result.push(data.slice(i, i + 7));
    }
    return result;
  }, [data]);

  // Calculate month labels with their positions
  const monthLabels = useMemo(() => {
    if (data.length === 0) return [];

    const labels: { name: string; weekIndex: number }[] = [];
    let currentMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // Check the first day of each week
      if (week.length > 0) {
        const date = new Date(week[0].date);
        const month = date.getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({ name: monthNames[month], weekIndex });
        }
      }
    });

    return labels;
  }, [data, weeks]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (data.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Writing Activity</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No writing activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex">
        {/* Spacer for day labels column */}
        <div className="w-8 shrink-0" />
        {/* Month labels row */}
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-[3px] md:gap-1">
            {monthLabels.map((label, i) => {
              // Calculate width based on weeks until next month
              const nextLabel = monthLabels[i + 1];
              const weekSpan = nextLabel
                ? nextLabel.weekIndex - label.weekIndex
                : weeks.length - label.weekIndex;

              return (
                <div
                  key={`${label.name}-${label.weekIndex}`}
                  className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground shrink-0"
                  style={{
                    width: `calc(${weekSpan} * (10px + 3px))`,
                  }}
                >
                  {label.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] sm:gap-[3px] md:gap-1 w-6 sm:w-7 md:w-8 shrink-0">
          {dayLabels.map((day, i) => (
            <div
              key={day}
              className="h-2 sm:h-2.5 md:h-3 flex items-center"
            >
              <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                {i % 2 === 1 ? day : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Heatmap cells */}
        <TooltipProvider delayDuration={100}>
          <div className="flex-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="flex gap-[2px] sm:gap-[3px] md:gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px] sm:gap-[3px] md:gap-1">
                  {week.map((cell) => (
                    <Tooltip key={cell.date}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm cursor-pointer',
                            'transition-all duration-150',
                            'hover:scale-125 hover:ring-2 hover:ring-primary/30 hover:z-10',
                            levelColors[cell.level]
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-sm">
                        <div className="space-y-0.5">
                          <p className="font-semibold tabular-nums">
                            {cell.wordCount.toLocaleString()} words
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(cell.date)}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
