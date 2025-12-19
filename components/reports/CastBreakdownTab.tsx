'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene, Character } from '@/types/screenplay';
import { downloadCSV, calculateCastBreakdown, calculateTotalPages } from './utils';

interface CastBreakdownTabProps {
  scenes: Scene[];
  characters: Character[];
}

export function CastBreakdownTab({ scenes, characters }: CastBreakdownTabProps) {
  const totalPages = useMemo(() => calculateTotalPages(scenes), [scenes]);
  const castBreakdownData = useMemo(
    () => calculateCastBreakdown(characters, scenes, totalPages),
    [characters, scenes, totalPages]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Cast Breakdown by Character</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(castBreakdownData, 'cast-breakdown')}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {castBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No characters found. Characters will appear as you write.
        </div>
      ) : (
        <div className="space-y-3">
          {castBreakdownData.map((cast, index) => (
            <div
              key={index}
              className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{cast.characterName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Scenes {cast.firstAppearance} - {cast.lastAppearance}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {cast.totalScenes} scenes
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Dialogue Lines:</span>
                  <span className="ml-2 font-medium">{cast.dialogueLines}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Appearances:</span>
                  <span className="ml-2 font-medium">{cast.totalScenes}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Page Count:</span>
                  <span className="ml-2 font-medium">{cast.pageCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Screen Time:</span>
                  <span className="ml-2 font-medium">{cast.screenTime}m ({cast.screenTimePercentage}%)</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Scene Numbers:</p>
                <div className="flex flex-wrap gap-1">
                  {cast.scenes.map((sceneNum, i) => (
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
    </div>
  );
}
