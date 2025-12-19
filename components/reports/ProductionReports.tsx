'use client';

import { useState } from 'react';
import { FileText, Users, MapPin, Sun, Home, Clock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductionReportsProps } from './types';
import { SceneBreakdownTab } from './SceneBreakdownTab';
import { CastBreakdownTab } from './CastBreakdownTab';
import { LocationListTab } from './LocationListTab';
import { DayNightTab } from './DayNightTab';
import { IntExtTab } from './IntExtTab';
import { ScreenTimeTab } from './ScreenTimeTab';

export function ProductionReports({
  isOpen,
  onClose,
  scenes,
  characters,
  locations,
  screenplayTitle,
}: ProductionReportsProps) {
  const [activeTab, setActiveTab] = useState('scene-breakdown');

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

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div>
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
                <TabsTrigger value="day-night" className="gap-2">
                  <Sun className="h-4 w-4" />
                  Day/Night
                </TabsTrigger>
                <TabsTrigger value="int-ext" className="gap-2">
                  <Home className="h-4 w-4" />
                  INT/EXT
                </TabsTrigger>
                <TabsTrigger value="screen-time" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Screen Time
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scene-breakdown" className="p-6">
                <SceneBreakdownTab scenes={scenes} characters={characters} />
              </TabsContent>

              <TabsContent value="cast-breakdown" className="p-6">
                <CastBreakdownTab scenes={scenes} characters={characters} />
              </TabsContent>

              <TabsContent value="location-list" className="p-6">
                <LocationListTab scenes={scenes} locations={locations} />
              </TabsContent>

              <TabsContent value="day-night" className="p-6">
                <DayNightTab scenes={scenes} />
              </TabsContent>

              <TabsContent value="int-ext" className="p-6">
                <IntExtTab scenes={scenes} />
              </TabsContent>

              <TabsContent value="screen-time" className="p-6">
                <ScreenTimeTab scenes={scenes} characters={characters} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
