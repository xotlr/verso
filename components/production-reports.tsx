'use client';

import React, { useState, useMemo } from 'react';
import { Scene, Character, Location } from '@/types/screenplay';
import { FileText, Users, MapPin, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { downloadFile } from '@/lib/dom-utils';

interface ProductionReportsProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  screenplayTitle: string;
}

export function ProductionReports({
  isOpen,
  onClose,
  scenes,
  characters,
  locations,
  screenplayTitle,
}: ProductionReportsProps) {
  const [activeTab, setActiveTab] = useState('scene-breakdown');

  // Generate scene breakdown data
  const sceneBreakdownData = useMemo(() => {
    return scenes.map((scene, index) => ({
      sceneNumber: `${index + 1}`,
      heading: scene.heading,
      location: scene.location.name,
      timeOfDay: scene.timeOfDay,
      pageCount: Math.ceil(scene.elements.length / 10), // Rough estimate
      characters: scene.characters,
      synopsis: scene.synopsis || 'No synopsis',
    }));
  }, [scenes]);

  // Generate cast breakdown data
  const castBreakdownData = useMemo(() => {
    return characters.map((character) => {
      const characterScenes = scenes.filter(s => s.characters.includes(character.name));
      return {
        characterName: character.name,
        totalScenes: characterScenes.length,
        scenes: characterScenes.map((s, i) => scenes.indexOf(s) + 1),
        firstAppearance: characterScenes.length > 0 ? scenes.indexOf(characterScenes[0]) + 1 : 0,
        lastAppearance: characterScenes.length > 0 ? scenes.indexOf(characterScenes[characterScenes.length - 1]) + 1 : 0,
        dialogueLines: character.appearances.reduce((sum, app) => sum + app.dialogueCount, 0),
      };
    }).sort((a, b) => b.totalScenes - a.totalScenes);
  }, [characters, scenes]);

  // Generate location breakdown data
  const locationBreakdownData = useMemo(() => {
    return locations.map((location) => {
      const locationScenes = scenes.filter(s => s.location.name === location.name);
      return {
        name: location.name,
        type: location.type,
        totalScenes: locationScenes.length,
        scenes: locationScenes.map((s) => scenes.indexOf(s) + 1),
      };
    }).sort((a, b) => b.totalScenes - a.totalScenes);
  }, [locations, scenes]);

  const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (Array.isArray(value)) return `"${value.join(', ')}"`;
        return `"${value}"`;
      }).join(','))
    ].join('\n');

    downloadFile(csv, `${filename}.csv`, 'text/csv');
  };

  const printReport = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card/50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Production Reports</DialogTitle>
              <DialogDescription>{screenplayTitle}</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={printReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-6 sticky top-0 z-10 bg-card/80 backdrop-blur-xl">
              <TabsTrigger value="scene-breakdown" className="gap-2">
                <FileText className="h-4 w-4" />
                Scene Breakdown
              </TabsTrigger>
              <TabsTrigger value="cast-breakdown" className="gap-2">
                <Users className="h-4 w-4" />
                Cast Breakdown
              </TabsTrigger>
              <TabsTrigger value="location-list" className="gap-2">
                <MapPin className="h-4 w-4" />
                Location List
              </TabsTrigger>
            </TabsList>

            {/* Scene Breakdown */}
            <TabsContent value="scene-breakdown" className="p-6">
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
            </TabsContent>

            {/* Cast Breakdown */}
            <TabsContent value="cast-breakdown" className="p-6">
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

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Dialogue Lines:</span>
                            <span className="ml-2 font-medium">{cast.dialogueLines}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Appearances:</span>
                            <span className="ml-2 font-medium">{cast.totalScenes}</span>
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
            </TabsContent>

            {/* Location List */}
            <TabsContent value="location-list" className="p-6">
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
                      <div
                        key={index}
                        className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
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
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
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
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
