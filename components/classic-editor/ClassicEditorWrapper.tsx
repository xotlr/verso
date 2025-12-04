'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ClassicEditor } from './ClassicEditor';
import { plainTextToBlocks, blocksToPlainText } from '@/lib/classic-editor/converter';
import { ScriptBlock, ScriptMetadata, BlockType } from '@/lib/classic-editor/types';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Types matching the ProseMirror editor for sidebar compatibility
export interface ClassicSceneInfo {
  id: string;
  type: string;
  location: string;
  timeOfDay: string;
  sceneNumber: string | null;
  position: number;
}

export interface ClassicCharacterInfo {
  id: string;
  name: string;
  dialogueCount: number;
}

interface ClassicEditorWrapperProps {
  screenplayId: string;
  onTitleChange?: (title: string) => void;
  onScenesChange?: (scenes: ClassicSceneInfo[], characters: ClassicCharacterInfo[]) => void;
}

// Default initial blocks if screenplay is empty
const DEFAULT_BLOCKS: ScriptBlock[] = [
  { id: crypto.randomUUID(), type: BlockType.SCENE_HEADING, content: 'INT. LOCATION - DAY' },
  { id: crypto.randomUUID(), type: BlockType.ACTION, content: 'Description of the scene.' },
];

const DEFAULT_METADATA: ScriptMetadata = {
  titlePage: {
    title: 'Untitled Screenplay',
    author: '',
    contact: '',
    logline: '',
    date: new Date().toLocaleDateString(),
  },
  scenes: {},
  characters: {},
};

export function ClassicEditorWrapper({ screenplayId, onTitleChange, onScenesChange }: ClassicEditorWrapperProps) {
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [metadata, setMetadata] = useState<ScriptMetadata>(DEFAULT_METADATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocksRef = useRef<ScriptBlock[]>([]);

  // Extract scenes and characters from blocks for sidebar
  const extractedInfo = useMemo(() => {
    const scenes: ClassicSceneInfo[] = [];
    const characterCounts = new Map<string, { id: string; count: number }>();
    let sceneCounter = 0;

    blocks.forEach((block, index) => {
      if (block.type === BlockType.SCENE_HEADING) {
        sceneCounter++;
        // Parse scene heading like "INT. LOCATION - DAY"
        const text = block.content.replace(/<[^>]+>/g, '').trim();
        const match = text.match(/^(INT|EXT|INT\/EXT|I\/E)\.?\s*(.+?)(?:\s*-\s*(.+))?$/i);

        scenes.push({
          id: block.id,
          type: match?.[1]?.toUpperCase() || 'INT',
          location: match?.[2]?.trim() || text,
          timeOfDay: match?.[3]?.trim() || '',
          sceneNumber: String(sceneCounter),
          position: index,
        });
      } else if (block.type === BlockType.CHARACTER) {
        const name = block.content.replace(/<[^>]+>/g, '').split('(')[0].trim().toUpperCase();
        if (name) {
          const existing = characterCounts.get(name);
          if (existing) {
            existing.count++;
          } else {
            characterCounts.set(name, { id: block.id, count: 1 });
          }
        }
      }
    });

    const characters: ClassicCharacterInfo[] = Array.from(characterCounts.entries()).map(([name, data]) => ({
      id: data.id,
      name,
      dialogueCount: data.count,
    }));

    return { scenes, characters };
  }, [blocks]);

  // Notify parent of scenes/characters changes
  useEffect(() => {
    onScenesChange?.(extractedInfo.scenes, extractedInfo.characters);
  }, [extractedInfo, onScenesChange]);

  // Load screenplay from database
  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`);
        if (response.ok) {
          const screenplay = await response.json();
          const content = screenplay.content || '';
          const title = screenplay.title || 'Untitled Screenplay';

          if (onTitleChange) {
            onTitleChange(title);
          }

          // Convert content to blocks
          if (content) {
            const parsedBlocks = plainTextToBlocks(content);
            if (parsedBlocks.length > 0) {
              setBlocks(parsedBlocks);
              blocksRef.current = parsedBlocks;
            } else {
              setBlocks(DEFAULT_BLOCKS);
              blocksRef.current = DEFAULT_BLOCKS;
            }
          } else {
            setBlocks(DEFAULT_BLOCKS);
            blocksRef.current = DEFAULT_BLOCKS;
          }

          // Create metadata from blocks
          setMetadata({
            ...DEFAULT_METADATA,
            titlePage: {
              ...DEFAULT_METADATA.titlePage,
              title,
              author: screenplay.author || '',
              logline: screenplay.logline || '',
            },
          });
        }
      } catch (error) {
        console.error('Error loading screenplay:', error);
        setBlocks(DEFAULT_BLOCKS);
        blocksRef.current = DEFAULT_BLOCKS;
      } finally {
        setIsLoading(false);
      }
    };

    loadScreenplay();
  }, [screenplayId, onTitleChange]);

  // Save screenplay to database
  const saveScreenplay = useCallback(async (blocksToSave: ScriptBlock[]) => {
    setIsSaving(true);
    try {
      const content = blocksToPlainText(blocksToSave);
      const response = await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving screenplay:', error);
      toast.error('Failed to save screenplay');
    } finally {
      setIsSaving(false);
    }
  }, [screenplayId]);

  // Handle blocks change with debounced auto-save
  const handleBlocksChange = useCallback((newBlocks: ScriptBlock[]) => {
    blocksRef.current = newBlocks;
    setBlocks(newBlocks);

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveScreenplay(blocksRef.current);
    }, 2000);
  }, [saveScreenplay]);

  // Manual save
  const handleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveScreenplay(blocksRef.current);
    toast.success('Screenplay saved');
  }, [saveScreenplay]);

  // Handle metadata change (title page updates)
  const metadataSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMetadataChange = useCallback(async (newMetadata: ScriptMetadata) => {
    setMetadata(newMetadata);

    // Update title in header if it changed
    if (newMetadata.titlePage.title && onTitleChange) {
      onTitleChange(newMetadata.titlePage.title);
    }

    // Debounce save to API
    if (metadataSaveTimeoutRef.current) {
      clearTimeout(metadataSaveTimeoutRef.current);
    }
    metadataSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newMetadata.titlePage.title,
            author: newMetadata.titlePage.author,
            logline: newMetadata.titlePage.logline,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save metadata');
        }
      } catch (error) {
        console.error('Error saving metadata:', error);
        toast.error('Failed to save title page');
      }
    }, 1000);
  }, [screenplayId, onTitleChange]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (metadataSaveTimeoutRef.current) {
        clearTimeout(metadataSaveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <ClassicEditor
      initialBlocks={blocks}
      initialMetadata={metadata}
      onBlocksChange={handleBlocksChange}
      onMetadataChange={handleMetadataChange}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}
