'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Scene, Character } from '@/types/screenplay';
import { downloadCSV, calculateCastBreakdown, calculateTotalPages } from './utils';

interface ScreenTimeTabProps {
  scenes: Scene[];
  characters: Character[];
}

export function ScreenTimeTab({ scenes, characters }: ScreenTimeTabProps) {
  const totalPages = useMemo(() => calculateTotalPages(scenes), [scenes]);
  const castBreakdownData = useMemo(
    () => calculateCastBreakdown(characters, scenes, totalPages),
    [characters, scenes, totalPages]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Screen Time Estimates</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(
            castBreakdownData.map(c => ({
              character: c.characterName,
              pages: c.pageCount,
              screenTimeMinutes: c.screenTime,
              percentageOfFilm: `${c.screenTimePercentage}%`,
              scenes: c.totalScenes,
              dialogueLines: c.dialogueLines,
            })),
            'screen-time-estimates'
          )}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border border-border mb-6">
        <p className="text-sm text-muted-foreground mb-2">
          Based on the industry standard of approximately 1 page = 1 minute of screen time
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Pages</p>
            <p className="text-2xl font-bold">{totalPages}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Est. Runtime</p>
            <p className="text-2xl font-bold">
              {totalPages >= 60
                ? `${Math.floor(totalPages / 60)}h ${totalPages % 60}m`
                : `${totalPages}m`
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Characters</p>
            <p className="text-2xl font-bold">{castBreakdownData.length}</p>
          </div>
        </div>
      </div>

      {castBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No characters found. Characters will appear as you write.
        </div>
      ) : (
        <div className="space-y-3">
          {castBreakdownData.map((cast, index) => (
            <div key={index} className="card-hoverable">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{cast.characterName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {cast.totalScenes} scenes · {cast.dialogueLines} lines
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {cast.screenTime >= 60
                      ? `${Math.floor(cast.screenTime / 60)}h ${cast.screenTime % 60}m`
                      : `${cast.screenTime}m`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">{cast.pageCount} pages</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Screen Time</span>
                  <span className="font-medium">{cast.screenTimePercentage}% of film</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${cast.screenTimePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top 5 Characters Summary */}
      {castBreakdownData.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border mt-6">
          <p className="text-sm font-medium mb-3">Top Characters by Screen Time</p>
          <div className="space-y-2">
            {castBreakdownData.slice(0, 5).map((cast, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{cast.characterName}</span>
                </span>
                <span className="font-mono">
                  {cast.screenTime}m ({cast.screenTimePercentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
