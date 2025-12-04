'use client';

import React from 'react';
import { BlockType } from '@/lib/classic-editor/types';
import { Type, AlignLeft, User, MessageSquare, Parentheses, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  currentType: BlockType;
  onTypeChange: (type: BlockType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ currentType, onTypeChange }) => {
  const tools = [
    { type: BlockType.SECTION, icon: <BookOpen size={16} />, label: "Act" },
    { type: BlockType.SCENE_HEADING, icon: <AlignLeft size={16} />, label: "Scene" },
    { type: BlockType.ACTION, icon: <Type size={16} />, label: "Action" },
    { type: BlockType.CHARACTER, icon: <User size={16} />, label: "Character" },
    { type: BlockType.DIALOGUE, icon: <MessageSquare size={16} />, label: "Dialogue" },
    { type: BlockType.PARENTHETICAL, icon: <Parentheses size={16} />, label: "Paren" },
    { type: BlockType.TRANSITION, icon: <ArrowRight size={16} />, label: "Trans" },
  ];

  return (
    <div className="max-w-[calc(100vw-2rem)] overflow-x-auto bg-popover/95 backdrop-blur-md text-popover-foreground p-1 sm:p-1.5 rounded-full shadow-2xl border border-border flex items-center gap-0.5 sm:gap-1">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onTypeChange(tool.type)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all shrink-0",
            currentType === tool.type
              ? "bg-primary text-primary-foreground shadow-sm scale-105"
              : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
          )}
        >
          {tool.icon}
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}
    </div>
  );
};
