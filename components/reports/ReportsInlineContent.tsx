'use client';

import { useState } from 'react';
import { FileText, Users, MapPin, Sun, Home, Clock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scene, Character, Location } from '@/types/screenplay';
import { SceneBreakdownTab } from './SceneBreakdownTab';
import { CastBreakdownTab } from './CastBreakdownTab';
import { LocationListTab } from './LocationListTab';
import { DayNightTab } from './DayNightTab';
import { IntExtTab } from './IntExtTab';
import { ScreenTimeTab } from './ScreenTimeTab';

interface ReportsInlineContentProps {
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  screenplayTitle: string;
}

export function ReportsInlineContent({
  scenes,
  characters,
  locations,
  screenplayTitle,
}: ReportsInlineContentProps) {
  const [activeTab, setActiveTab] = useState('scene-breakdown');

  const printReport = () => {
    window.print();
  };

  return (
    <div className="bg-card rounded-lg border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Production Reports</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{screenplayTitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={printReport} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-6 overflow-x-auto">
          <TabsTrigger value="scene-breakdown" className="gap-2 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Scene Breakdown</span>
            <span className="sm:hidden">Scenes</span>
          </TabsTrigger>
          <TabsTrigger value="cast-breakdown" className="gap-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cast Breakdown</span>
            <span className="sm:hidden">Cast</span>
          </TabsTrigger>
          <TabsTrigger value="location-list" className="gap-2 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Location List</span>
            <span className="sm:hidden">Locations</span>
          </TabsTrigger>
          <TabsTrigger value="day-night" className="gap-2 text-xs sm:text-sm">
            <Sun className="h-3.5 w-3.5" />
            <span>Day/Night</span>
          </TabsTrigger>
          <TabsTrigger value="int-ext" className="gap-2 text-xs sm:text-sm">
            <Home className="h-3.5 w-3.5" />
            <span>INT/EXT</span>
          </TabsTrigger>
          <TabsTrigger value="screen-time" className="gap-2 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Screen Time</span>
            <span className="sm:hidden">Time</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scene-breakdown" className="p-6 m-0">
          <SceneBreakdownTab scenes={scenes} characters={characters} />
        </TabsContent>

        <TabsContent value="cast-breakdown" className="p-6 m-0">
          <CastBreakdownTab scenes={scenes} characters={characters} />
        </TabsContent>

        <TabsContent value="location-list" className="p-6 m-0">
          <LocationListTab scenes={scenes} locations={locations} />
        </TabsContent>

        <TabsContent value="day-night" className="p-6 m-0">
          <DayNightTab scenes={scenes} />
        </TabsContent>

        <TabsContent value="int-ext" className="p-6 m-0">
          <IntExtTab scenes={scenes} />
        </TabsContent>

        <TabsContent value="screen-time" className="p-6 m-0">
          <ScreenTimeTab scenes={scenes} characters={characters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
