'use client';

import { useMemo } from 'react';
import { Home, Trees, MapPin, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene } from '@/types/screenplay';
import { downloadCSV, calculateIntExtBreakdown } from './utils';

interface IntExtTabProps {
  scenes: Scene[];
}

export function IntExtTab({ scenes }: IntExtTabProps) {
  const intExtBreakdownData = useMemo(
    () => calculateIntExtBreakdown(scenes),
    [scenes]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Interior/Exterior Breakdown</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(
            intExtBreakdownData.map(d => ({ ...d, scenes: d.scenes.join(', ') })),
            'int-ext-breakdown'
          )}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {intExtBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No scenes found. Start writing to generate reports.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intExtBreakdownData.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {item.locationType === 'INT' ? (
                    <Home className="h-5 w-5 text-amber-500" />
                  ) : item.locationType === 'EXT' ? (
                    <Trees className="h-5 w-5 text-green-500" />
                  ) : (
                    <MapPin className="h-5 w-5 text-purple-500" />
                  )}
                  <h4 className="font-semibold">{item.locationType}</h4>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {item.percentage}%
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground text-xs">Scenes</p>
                  <p className="text-xl font-bold">{item.totalScenes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pages</p>
                  <p className="text-xl font-bold">{item.pageCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Locations</p>
                  <p className="text-xl font-bold">{item.uniqueLocations}</p>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.locationType === 'INT' ? 'bg-amber-500' :
                    item.locationType === 'EXT' ? 'bg-green-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Interior Scenes</p>
          <p className="text-2xl font-bold">
            {intExtBreakdownData.find(d => d.locationType === 'INT')?.totalScenes || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Exterior Scenes</p>
          <p className="text-2xl font-bold">
            {intExtBreakdownData.find(d => d.locationType === 'EXT')?.totalScenes || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">INT/EXT (Both)</p>
          <p className="text-2xl font-bold">
            {intExtBreakdownData.find(d => d.locationType === 'INT/EXT')?.totalScenes || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
