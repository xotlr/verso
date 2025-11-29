'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableTitleProps {
  value: string;
  onSave: (newTitle: string) => void;
  className?: string;
}

export function EditableTitle({ value, onSave, className }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTitle(value);
  }, [value]);

  const handleSave = () => {
    if (title.trim() && title !== value) {
      onSave(title.trim());
    } else {
      setTitle(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn('h-6 px-2 py-0 text-sm w-48', className)}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'text-foreground hover:text-primary hover:underline cursor-pointer transition-colors',
        className
      )}
    >
      {value}
    </button>
  );
}
