'use client';

import { useMemo } from 'react';
import { Sun, Moon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene } from '@/types/screenplay';
import { downloadCSV, calculateDayNightBreakdown } from './utils';

interface DayNightTabProps {
  scenes: Scene[];
}

export function DayNightTab({ scenes }: DayNightTabProps) {
  const dayNightBreakdownData = useMemo(
    () => calculateDayNightBreakdown(scenes),
    [scenes]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Day/Night Breakdown</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(
            dayNightBreakdownData.map(d => ({ ...d, scenes: d.scenes.join(', ') })),
            'day-night-breakdown'
          )}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {dayNightBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No scenes found. Start writing to generate reports.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayNightBreakdownData.map((item, index) => (
            <div key={index} className="card-hoverable">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {item.timeOfDay === 'DAY' ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : item.timeOfDay === 'NIGHT' ? (
                    <Moon className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-orange-400" />
                  )}
                  <h4 className="font-semibold">{item.timeOfDay}</h4>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {item.percentage}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground">Scenes</p>
                  <p className="text-2xl font-bold">{item.totalScenes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pages</p>
                  <p className="text-2xl font-bold">{item.pageCount}</p>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Day Scenes</p>
          <p className="text-2xl font-bold">
            {dayNightBreakdownData.find(d => d.timeOfDay === 'DAY')?.totalScenes || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Night Scenes</p>
          <p className="text-2xl font-bold">
            {dayNightBreakdownData.find(d => d.timeOfDay === 'NIGHT')?.totalScenes || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Dawn/Dusk</p>
          <p className="text-2xl font-bold">
            {dayNightBreakdownData.filter(d => d.timeOfDay === 'DAWN' || d.timeOfDay === 'DUSK').reduce((sum, d) => sum + d.totalScenes, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Other</p>
          <p className="text-2xl font-bold">
            {dayNightBreakdownData.filter(d => !['DAY', 'NIGHT', 'DAWN', 'DUSK'].includes(d.timeOfDay)).reduce((sum, d) => sum + d.totalScenes, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
