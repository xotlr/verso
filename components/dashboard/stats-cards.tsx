'use client';

import { Film, Folder, FileText, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  screenplayCount: number;
  projectCount: number;
  wordsThisWeek: number;
  currentStreak: number;
}

export function StatsCards({
  screenplayCount,
  projectCount,
  wordsThisWeek,
  currentStreak,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Screenplays',
      value: screenplayCount,
      icon: Film,
      color: 'text-blue-500',
    },
    {
      label: 'Projects',
      value: projectCount,
      icon: Folder,
      color: 'text-purple-500',
    },
    {
      label: 'Words This Week',
      value: wordsThisWeek.toLocaleString(),
      icon: FileText,
      color: 'text-green-500',
    },
    {
      label: 'Day Streak',
      value: currentStreak,
      icon: Flame,
      color: currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-border transition-all duration-200">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 md:p-2.5 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
