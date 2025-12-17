'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, User, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Character {
  id: string;
  name: string;
  role: 'main' | 'recurring' | 'guest';
  description: string;
}

interface SeriesCharactersTabProps {
  seriesId: string;
  characters?: Character[];
  onAddCharacter?: (character: Omit<Character, 'id'>) => void;
  onEditCharacter?: (id: string, character: Partial<Character>) => void;
  onDeleteCharacter?: (id: string) => void;
}

const roleLabels = {
  main: 'Main Cast',
  recurring: 'Recurring',
  guest: 'Guest',
};

const roleColors = {
  main: 'bg-primary/10 text-primary border-primary/20',
  recurring: 'bg-muted text-muted-foreground border-border/50',
  guest: 'bg-muted/50 text-muted-foreground/70 border-border/30',
};

export function SeriesCharactersTab({
  seriesId: _seriesId,
  characters = [],
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}: SeriesCharactersTabProps) {
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [newCharacter, setNewCharacter] = useState<{
    name: string;
    role: 'main' | 'recurring' | 'guest';
    description: string;
  }>({
    name: '',
    role: 'main',
    description: '',
  });

  // Group characters by role
  const mainCharacters = characters.filter(c => c.role === 'main');
  const recurringCharacters = characters.filter(c => c.role === 'recurring');
  const guestCharacters = characters.filter(c => c.role === 'guest');

  const handleAddCharacter = () => {
    if (!newCharacter.name.trim()) return;

    onAddCharacter?.({
      name: newCharacter.name.trim(),
      role: newCharacter.role,
      description: newCharacter.description.trim(),
    });

    setNewCharacter({ name: '', role: 'main', description: '' });
    setIsAddingCharacter(false);
  };

  const CharacterCard = ({ character }: { character: Character }) => (
    <div className="group relative rounded-lg border bg-card p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-semibold">{character.name}</h4>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium border',
                roleColors[character.role]
              )}
            >
              {roleLabels[character.role]}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditCharacter?.(character.id, {})}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDeleteCharacter?.(character.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {character.description && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
          {character.description}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Characters</h3>
          <p className="text-sm text-muted-foreground">
            Build your cast of characters for the series.
          </p>
        </div>
        <Button onClick={() => setIsAddingCharacter(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Character
        </Button>
      </div>

      {/* Character Grid or Empty State */}
      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
          <h4 className="font-semibold mb-1">No characters yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Start building your cast by adding your first character.
          </p>
          <Button variant="outline" onClick={() => setIsAddingCharacter(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Character
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Cast */}
          {mainCharacters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Main Cast ({mainCharacters.length})
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mainCharacters.map(character => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </div>
          )}

          {/* Recurring */}
          {recurringCharacters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Recurring ({recurringCharacters.length})
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recurringCharacters.map(character => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </div>
          )}

          {/* Guest */}
          {guestCharacters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                Guest ({guestCharacters.length})
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {guestCharacters.map(character => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Character Dialog */}
      <Dialog open={isAddingCharacter} onOpenChange={setIsAddingCharacter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Character</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="char-name">Name</Label>
              <Input
                id="char-name"
                placeholder="Character name"
                value={newCharacter.name}
                onChange={e =>
                  setNewCharacter(prev => ({ ...prev, name: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="char-role">Role</Label>
              <Select
                value={newCharacter.role}
                onValueChange={(value: 'main' | 'recurring' | 'guest') =>
                  setNewCharacter(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Cast</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="char-desc">Description</Label>
              <Textarea
                id="char-desc"
                placeholder="Brief character description..."
                value={newCharacter.description}
                onChange={e =>
                  setNewCharacter(prev => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAddingCharacter(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCharacter} disabled={!newCharacter.name.trim()}>
                Add Character
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
