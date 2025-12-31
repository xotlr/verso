'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TapestryNode, NOTE_COLORS, NODE_TYPE_COLORS, TapestryNodeType } from '@/types/tapestry';
import { cn } from '@/lib/utils';
import { Check, Film, User, MapPin, Package, StickyNote } from 'lucide-react';
import { PaperNoise } from '@/components/prosemirror/PaperNoise';

interface NoteEditorDialogProps {
  note: TapestryNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: TapestryNode) => void;
  onDelete: (noteId: string) => void;
}

const NODE_TYPE_LABELS: Record<TapestryNodeType, { label: string; icon: typeof StickyNote }> = {
  note: { label: 'Note', icon: StickyNote },
  scene: { label: 'Scene', icon: Film },
  character: { label: 'Character', icon: User },
  location: { label: 'Location', icon: MapPin },
  item: { label: 'Item', icon: Package },
};

const ITEM_TYPES = [
  { value: 'prop', label: 'Prop' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
];

const LOCATION_TYPES = [
  { value: 'INT', label: 'Interior (INT)' },
  { value: 'EXT', label: 'Exterior (EXT)' },
  { value: 'INT/EXT', label: 'Interior/Exterior' },
];

export function NoteEditorDialog({
  note,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(NOTE_COLORS[0]);
  const [itemType, setItemType] = useState<string>('prop');
  const [locationType, setLocationType] = useState<string>('INT');

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setItemType(note.itemType || 'prop');
      setLocationType(note.locationType || 'INT');
    }
  }, [note]);

  const handleSave = () => {
    if (!note) return;

    const updatedNode: TapestryNode = {
      ...note,
      title,
      content,
      color,
    };

    // Add type-specific fields
    if (note.type === 'item') {
      updatedNode.itemType = itemType as 'prop' | 'vehicle' | 'weapon' | 'document' | 'other';
    }
    if (note.type === 'location') {
      updatedNode.locationType = locationType as 'INT' | 'EXT' | 'INT/EXT';
    }

    onSave(updatedNode);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!note) return;
    onDelete(note.id);
    onOpenChange(false);
  };

  if (!note) return null;

  const nodeType = note.type || 'note';
  const TypeIcon = NODE_TYPE_LABELS[nodeType].icon;
  const typeLabel = NODE_TYPE_LABELS[nodeType].label;

  // Determine which fields to show based on type
  const isLinkedToScreenplay = !!note.sceneId || !!note.characterId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md relative overflow-hidden">
        {/* Paper texture overlay (procreate style) */}
        <PaperNoise opacity={0.02} intensity={0.12} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" style={{ color: NODE_TYPE_COLORS[nodeType] }} />
            Edit {typeLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title">
              {nodeType === 'scene' ? 'Scene Title' :
               nodeType === 'character' ? 'Character Name' :
               nodeType === 'location' ? 'Location Name' :
               nodeType === 'item' ? 'Item Name' : 'Title'}
            </Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${typeLabel} title...`}
              className="font-medium"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="note-content">
              {nodeType === 'scene' ? 'Summary' :
               nodeType === 'character' ? 'Description' :
               'Details'}
            </Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                nodeType === 'scene' ? 'Scene summary...' :
                nodeType === 'character' ? 'Character description...' :
                'Write details...'
              }
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Type-specific fields */}
          {nodeType === 'item' && (
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeType === 'location' && (
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Read-only stats for auto-imported nodes */}
          {nodeType === 'character' && note.dialogueCount !== undefined && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <div className="flex justify-between">
                <span>Dialogue Count:</span>
                <span className="font-medium">{note.dialogueCount}</span>
              </div>
              {note.sceneAppearances && note.sceneAppearances.length > 0 && (
                <div className="flex justify-between">
                  <span>Appears in:</span>
                  <span className="font-medium">{note.sceneAppearances.length} scenes</span>
                </div>
              )}
            </div>
          )}

          {nodeType === 'scene' && note.sceneNumber !== undefined && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <div className="flex justify-between">
                <span>Scene Number:</span>
                <span className="font-medium">{note.sceneNumber}</span>
              </div>
              {note.timeOfDay && (
                <div className="flex justify-between">
                  <span>Time of Day:</span>
                  <span className="font-medium">{note.timeOfDay}</span>
                </div>
              )}
            </div>
          )}

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-md border-2 transition-all',
                    'hover:scale-110 active:scale-95',
                    color === c
                      ? 'border-foreground ring-2 ring-foreground/20'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && (
                    <Check className="h-4 w-4 mx-auto text-foreground/70" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Linked indicator */}
          {isLinkedToScreenplay && (
            <div className="text-xs text-muted-foreground bg-primary/10 rounded px-2 py-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              Auto-imported from screenplay
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
