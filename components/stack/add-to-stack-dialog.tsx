'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HiRectangleGroup, HiOutlineRectangleGroup } from 'react-icons/hi2';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StackOption {
  id: string;
  name: string;
  screenplayCount: number;
}

interface AddToStackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayTitle: string;
  stacks: StackOption[];
  onAddToStack: (stackId: string) => void;
  onCreateNewStack: (name: string) => void;
}

export function AddToStackDialog({
  open,
  onOpenChange,
  screenplayTitle,
  stacks,
  onAddToStack,
  onCreateNewStack,
}: AddToStackDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newStackName, setNewStackName] = useState('');

  const filteredStacks = stacks.filter((stack) =>
    stack.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToStack = (stackId: string) => {
    onAddToStack(stackId);
    onOpenChange(false);
    setSearchQuery('');
  };

  const handleCreateStack = () => {
    if (newStackName.trim()) {
      onCreateNewStack(newStackName.trim());
      onOpenChange(false);
      setNewStackName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateStack();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewStackName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HiRectangleGroup className="h-5 w-5" />
            Add to Stack
          </DialogTitle>
          <DialogDescription>
            Add &ldquo;{screenplayTitle}&rdquo; to an existing stack or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          {stacks.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stacks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Stack list */}
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {filteredStacks.length > 0 ? (
                filteredStacks.map((stack) => (
                  <button
                    key={stack.id}
                    onClick={() => handleAddToStack(stack.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 p-3 rounded-lg',
                      'text-left text-sm',
                      'hover:bg-accent transition-colors',
                      'border border-transparent hover:border-border'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <HiOutlineRectangleGroup className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{stack.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {stack.screenplayCount} {stack.screenplayCount === 1 ? 'script' : 'scripts'}
                    </span>
                  </button>
                ))
              ) : stacks.length > 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stacks match &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stacks yet. Create one below.
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Create new stack */}
          <div className="border-t pt-4">
            {isCreating ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Stack name..."
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={handleCreateStack} disabled={!newStackName.trim()}>
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewStackName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Stack
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
