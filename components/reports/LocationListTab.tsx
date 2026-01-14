'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene, Location } from '@/types/screenplay';
import { downloadCSV, calculateLocationBreakdown } from './utils';

interface LocationListTabProps {
  scenes: Scene[];
  locations: Location[];
}

export function LocationListTab({ scenes, locations }: LocationListTabProps) {
  const locationBreakdownData = useMemo(
    () => calculateLocationBreakdown(locations, scenes),
    [locations, scenes]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Location List</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(locationBreakdownData, 'location-list')}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {locationBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No locations found. Locations will appear as you write scene headings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locationBreakdownData.map((location, index) => (
            <div key={index} className="card-hoverable">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold">{location.name}</h4>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {location.type}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{location.totalScenes}</p>
                  <p className="text-xs text-muted-foreground">scenes</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Scenes:</p>
                <div className="flex flex-wrap gap-1">
                  {location.scenes.map((sceneNum, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {sceneNum}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="stats-grid">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Locations</p>
          <p className="text-2xl font-bold">{locationBreakdownData.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">INT Locations</p>
          <p className="text-2xl font-bold">
            {locationBreakdownData.filter(l => l.type === 'INT').length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">EXT Locations</p>
          <p className="text-2xl font-bold">
            {locationBreakdownData.filter(l => l.type === 'EXT').length}
          </p>
        </div>
      </div>
    </div>
  );
}
