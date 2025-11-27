'use client';

import React, { useState } from 'react';
import { Scene } from '@/types/screenplay';
import { SceneNumbering, RevisionColor } from '@/types/production';
import { Hash, Lock, Unlock, Palette, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  sceneNumbering: SceneNumbering;
  onSceneNumberingChange: (numbering: SceneNumbering) => void;
  lockedScenes: Set<string>;
  onToggleSceneLock: (sceneId: string) => void;
  revisionColor: RevisionColor;
  onRevisionColorChange: (color: RevisionColor) => void;
}

export function ProductionPanel({
  isOpen,
  onClose,
  scenes,
  sceneNumbering,
  onSceneNumberingChange,
  lockedScenes,
  onToggleSceneLock,
  revisionColor,
  onRevisionColorChange,
}: ProductionPanelProps) {
  const [activeTab, setActiveTab] = useState('numbering');

  const revisionColors: { color: RevisionColor; label: string; bg: string }[] = [
    { color: 'white', label: 'White (Draft)', bg: 'bg-card border-2 border-border' },
    { color: 'blue', label: 'Blue', bg: 'bg-blue-400' },
    { color: 'pink', label: 'Pink', bg: 'bg-pink-400' },
    { color: 'yellow', label: 'Yellow', bg: 'bg-yellow-300' },
    { color: 'green', label: 'Green', bg: 'bg-green-400' },
    { color: 'goldenrod', label: 'Goldenrod', bg: 'bg-yellow-600' },
    { color: 'buff', label: 'Buff', bg: 'bg-orange-200' },
    { color: 'salmon', label: 'Salmon', bg: 'bg-orange-300' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card/50 sticky top-0 z-10">
          <DialogTitle className="text-2xl">Production Tools</DialogTitle>
          <DialogDescription>Professional screenplay production features</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent px-6 sticky top-0 z-10 bg-card/80 backdrop-blur-xl">
              <TabsTrigger value="numbering" className="gap-2">
                <Hash className="h-4 w-4" />
                Scene Numbering
              </TabsTrigger>
              <TabsTrigger value="locking" className="gap-2">
                <Lock className="h-4 w-4" />
                Scene Locking
              </TabsTrigger>
              <TabsTrigger value="revisions" className="gap-2">
                <Palette className="h-4 w-4" />
                Revisions
              </TabsTrigger>
            </TabsList>

            {/* Scene Numbering Tab */}
            <TabsContent value="numbering" className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Scene Numbers</label>
                  <Checkbox
                    checked={sceneNumbering.enabled}
                    onCheckedChange={(checked) => onSceneNumberingChange({ ...sceneNumbering, enabled: checked as boolean })}
                  />
                </div>

                {sceneNumbering.enabled && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Number</label>
                      <Input
                        type="number"
                        min={1}
                        value={sceneNumbering.startNumber}
                        onChange={(e) => onSceneNumberingChange({ ...sceneNumbering, startNumber: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Prefix (Optional)</label>
                      <Input
                        type="text"
                        placeholder="e.g., A, INT-"
                        value={sceneNumbering.prefix || ''}
                        onChange={(e) => onSceneNumberingChange({ ...sceneNumbering, prefix: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Suffix (Optional)</label>
                      <Input
                        type="text"
                        placeholder="e.g., A, -R"
                        value={sceneNumbering.suffix || ''}
                        onChange={(e) => onSceneNumberingChange({ ...sceneNumbering, suffix: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Display Side</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['left', 'right', 'both'] as const).map((side) => (
                          <button
                            key={side}
                            onClick={() => onSceneNumberingChange({ ...sceneNumbering, side })}
                            className={`p-3 rounded-lg border-2 transition-all capitalize ${
                              sceneNumbering.side === side
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {side}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <h4 className="text-sm font-semibold mb-2">Preview</h4>
                      <div className="flex items-center justify-between font-mono text-sm">
                        {sceneNumbering.side !== 'right' && (
                          <span className="text-primary">
                            {sceneNumbering.prefix}{sceneNumbering.startNumber}{sceneNumbering.suffix}
                          </span>
                        )}
                        <span className="flex-1 text-center">INT. LOCATION - DAY</span>
                        {sceneNumbering.side !== 'left' && (
                          <span className="text-primary">
                            {sceneNumbering.prefix}{sceneNumbering.startNumber}{sceneNumbering.suffix}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Industry Standard</p>
                    <p>Scene numbers appear on both sides of the page in professional screenplays for easier reference during production.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Scene Locking Tab */}
            <TabsContent value="locking" className="p-6 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Lock scenes to prevent changes during production. Locked scenes maintain their numbers even when scenes are added or removed.
                </p>

                {scenes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No scenes found. Start writing to see scenes here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scenes.map((scene, index) => {
                      const isLocked = lockedScenes.has(scene.id);
                      return (
                        <div
                          key={scene.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                            isLocked
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {sceneNumbering.enabled && (
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {sceneNumbering.prefix}{sceneNumbering.startNumber + index}{sceneNumbering.suffix}
                                </Badge>
                              )}
                              <span className="font-semibold text-sm truncate">
                                {scene.heading}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {scene.elements.length} elements
                            </p>
                          </div>
                          <Button
                            variant={isLocked ? "default" : "outline"}
                            size="sm"
                            onClick={() => onToggleSceneLock(scene.id)}
                            className="ml-4"
                          >
                            {isLocked ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Locked
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Unlocked
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Scene Locking</p>
                    <p>Locked scenes maintain their numbers even when you add, remove, or reorder other scenes. This is essential during production when scenes are being shot out of order.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Revisions Tab */}
            <TabsContent value="revisions" className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Revision Color</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {revisionColors.map(({ color, label, bg }) => (
                      <button
                        key={color}
                        onClick={() => onRevisionColorChange(color)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          revisionColor === color
                            ? 'border-primary scale-105'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-full h-12 rounded mb-2 ${bg}`} />
                        <p className="text-sm font-medium text-center">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                  <h4 className="text-sm font-semibold">Revision Color Standard</h4>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p><strong>White:</strong> Original draft</p>
                    <p><strong>Blue:</strong> First revision</p>
                    <p><strong>Pink:</strong> Second revision</p>
                    <p><strong>Yellow:</strong> Third revision</p>
                    <p><strong>Green:</strong> Fourth revision</p>
                    <p><strong>Goldenrod:</strong> Fifth revision</p>
                    <p><strong>Buff:</strong> Sixth revision</p>
                    <p><strong>Salmon:</strong> Seventh revision</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Revision Tracking</p>
                      <p>Professional screenplays use colored pages to track revisions. Each revision gets a new color, making it easy to identify what has changed in production.</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 border-t border-border bg-card/50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
