import { useState, useCallback, useEffect } from 'react';
import type { Act } from './ActHeader';

interface UseActManagementOptions {
  screenplayId?: string;
}

// Custom group: a user-created act with specific scene IDs
interface CustomGroup {
  id: string;
  name: string;
  sceneIds: string[];
}

export function useActManagement({ screenplayId }: UseActManagementOptions) {
  const [actNames, setActNames] = useState<Map<string, string>>(new Map());
  const [hiddenActs, setHiddenActs] = useState<Set<string>>(new Set());
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load act names, hidden acts, and custom groups from localStorage
  useEffect(() => {
    if (!screenplayId) return;

    const storedNames = localStorage.getItem(`act-names-${screenplayId}`);
    if (storedNames) {
      try {
        const parsed = JSON.parse(storedNames);
        setActNames(new Map(Object.entries(parsed)));
      } catch (e) {
        console.error('Failed to parse act names:', e);
      }
    }

    const storedHidden = localStorage.getItem(`hidden-acts-${screenplayId}`);
    if (storedHidden) {
      try {
        setHiddenActs(new Set(JSON.parse(storedHidden)));
      } catch (e) {
        console.error('Failed to parse hidden acts:', e);
      }
    }

    const storedGroups = localStorage.getItem(`custom-groups-${screenplayId}`);
    if (storedGroups) {
      try {
        setCustomGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse custom groups:', e);
      }
    }
  }, [screenplayId]);

  // Save act names to localStorage
  const saveActNames = useCallback((names: Map<string, string>) => {
    if (!screenplayId) return;
    localStorage.setItem(`act-names-${screenplayId}`, JSON.stringify(Object.fromEntries(names)));
  }, [screenplayId]);

  // Save hidden acts to localStorage
  const saveHiddenActs = useCallback((hidden: Set<string>) => {
    if (!screenplayId) return;
    localStorage.setItem(`hidden-acts-${screenplayId}`, JSON.stringify([...hidden]));
  }, [screenplayId]);

  // Save custom groups to localStorage
  const saveCustomGroups = useCallback((groups: CustomGroup[]) => {
    if (!screenplayId) return;
    localStorage.setItem(`custom-groups-${screenplayId}`, JSON.stringify(groups));
  }, [screenplayId]);

  // Ungroup/hide an act (scenes will show without grouping)
  const ungroupAct = useCallback((actId: string) => {
    const newHidden = new Set(hiddenActs);
    newHidden.add(actId);
    setHiddenActs(newHidden);
    saveHiddenActs(newHidden);
  }, [hiddenActs, saveHiddenActs]);

  // Group selected scenes into a new custom act
  const groupScenes = useCallback((sceneIds: string[]) => {
    if (sceneIds.length === 0) return;

    const newGroup: CustomGroup = {
      id: `custom-${Date.now()}`,
      name: `Group ${customGroups.length + 1}`,
      sceneIds,
    };

    const newGroups = [...customGroups, newGroup];
    setCustomGroups(newGroups);
    saveCustomGroups(newGroups);
  }, [customGroups, saveCustomGroups]);

  // Remove scenes from their custom group
  const ungroupScenes = useCallback((sceneIds: string[]) => {
    const sceneIdSet = new Set(sceneIds);
    const newGroups = customGroups
      .map(group => ({
        ...group,
        sceneIds: group.sceneIds.filter(id => !sceneIdSet.has(id)),
      }))
      .filter(group => group.sceneIds.length > 0);

    setCustomGroups(newGroups);
    saveCustomGroups(newGroups);
  }, [customGroups, saveCustomGroups]);

  // Check if a scene is in a custom group
  const getSceneCustomGroup = useCallback((sceneId: string): CustomGroup | null => {
    return customGroups.find(g => g.sceneIds.includes(sceneId)) || null;
  }, [customGroups]);

  // Reset all groupings
  const resetAllGroups = useCallback(() => {
    setHiddenActs(new Set());
    setCustomGroups([]);
    if (screenplayId) {
      localStorage.removeItem(`hidden-acts-${screenplayId}`);
      localStorage.removeItem(`custom-groups-${screenplayId}`);
    }
  }, [screenplayId]);

  // Start editing act name
  const startEditingAct = useCallback((actId: string, currentName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingActId(actId);
    setEditingName(currentName);
  }, []);

  // Save edited act name
  const saveActName = useCallback(() => {
    if (!editingActId) return;
    const trimmedName = editingName.trim();
    if (trimmedName) {
      const newNames = new Map(actNames);
      newNames.set(editingActId, trimmedName);
      setActNames(newNames);
      saveActNames(newNames);
    }
    setEditingActId(null);
    setEditingName('');
  }, [editingActId, editingName, actNames, saveActNames]);

  // Cancel editing
  const cancelEditingAct = useCallback(() => {
    setEditingActId(null);
    setEditingName('');
  }, []);

  // Get display name for act
  const getActDisplayName = useCallback((act: Act) => {
    return actNames.get(act.id) || act.name;
  }, [actNames]);

  // Check if act is hidden (ungrouped)
  const isActHidden = useCallback((actId: string) => {
    return hiddenActs.has(actId);
  }, [hiddenActs]);

  return {
    // State
    hiddenActs,
    customGroups,
    editingActId,
    editingName,
    hiddenActsCount: hiddenActs.size,

    // Actions
    ungroupAct,
    resetAllGroups,
    groupScenes,
    ungroupScenes,
    startEditingAct,
    saveActName,
    cancelEditingAct,
    setEditingName,

    // Helpers
    getActDisplayName,
    isActHidden,
    getSceneCustomGroup,
  };
}
