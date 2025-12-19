'use client';

import { useMemo } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scene, Character } from '@/types/screenplay';
import { downloadCSV, calculateSceneBreakdown } from './utils';

interface SceneBreakdownTabProps {
  scenes: Scene[];
  characters: Character[];
}

export function SceneBreakdownTab({ scenes, characters }: SceneBreakdownTabProps) {
  const sceneBreakdownData = useMemo(() => calculateSceneBreakdown(scenes), [scenes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Scene-by-Scene Breakdown</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCSV(sceneBreakdownData, 'scene-breakdown')}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {sceneBreakdownData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No scenes found. Start writing to generate reports.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">#</th>
                <th className="text-left py-3 px-4 font-semibold">Scene Heading</th>
                <th className="text-left py-3 px-4 font-semibold">Location</th>
                <th className="text-left py-3 px-4 font-semibold">Time</th>
                <th className="text-left py-3 px-4 font-semibold">Pages</th>
                <th className="text-left py-3 px-4 font-semibold">Characters</th>
              </tr>
            </thead>
            <tbody>
              {sceneBreakdownData.map((scene, index) => (
                <tr key={index} className="border-b border-border/50 hover:bg-accent/50">
                  <td className="py-3 px-4 font-mono">{scene.sceneNumber}</td>
                  <td className="py-3 px-4 font-medium">{scene.heading}</td>
                  <td className="py-3 px-4">{scene.location}</td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-xs">
                      {scene.timeOfDay}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">{scene.pageCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {scene.characters.slice(0, 3).map((char, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                      {scene.characters.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{scene.characters.length - 3}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Scenes</p>
          <p className="text-2xl font-bold">{sceneBreakdownData.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Pages</p>
          <p className="text-2xl font-bold">
            {sceneBreakdownData.reduce((sum, s) => sum + s.pageCount, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Characters</p>
          <p className="text-2xl font-bold">{characters.length}</p>
        </div>
      </div>
    </div>
  );
}
