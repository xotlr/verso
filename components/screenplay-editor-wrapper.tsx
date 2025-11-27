"use client";

import { useState } from "react";
import { ScreenplayEditor } from "./screenplay-editor";
import { ScreenplaySidebar } from "./screenplay-sidebar";
import { Scene, Character, Location } from "@/types/screenplay";
import { parseScreenplayText } from "@/lib/screenplay-utils";
import { useSettings } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function ScreenplayEditorWrapper() {
  const [screenplayText, setScreenplayText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | undefined>();

  const { settings, updateLayoutSettings } = useSettings();
  const isSidebarCollapsed = settings.layout.sidebarCollapsed;
  const layoutMode = settings.layout.layoutMode;

  const handleTextChange = (text: string) => {
    setScreenplayText(text);
    const parsed = parseScreenplayText(text);
    setScenes(parsed.scenes || []);
    setCharacters(parsed.characters || []);
    setLocations(parsed.locations || []);
  };

  const handleSidebarOpenChange = (open: boolean) => {
    updateLayoutSettings({ sidebarCollapsed: !open });
  };

  return (
    <SidebarProvider
      defaultOpen={!isSidebarCollapsed}
      open={!isSidebarCollapsed}
      onOpenChange={handleSidebarOpenChange}
      className={cn("h-full", `layout-${layoutMode}`)}
    >
      <SidebarInset className="flex-1 min-w-0">
        <ScreenplayEditor
          screenplayText={screenplayText}
          onChange={handleTextChange}
          scenes={scenes}
          characters={characters}
          onSceneClick={(scene) => setSelectedSceneId(scene.id)}
          selectedSceneId={selectedSceneId}
        />
      </SidebarInset>
      <ScreenplaySidebar
        scenes={scenes}
        characters={characters}
        locations={locations}
        selectedScene={scenes.find(s => s.id === selectedSceneId)}
        onSceneClick={(scene) => setSelectedSceneId(scene.id)}
      />
    </SidebarProvider>
  );
}
