'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import {
  TitlePageMetadata,
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  MARGIN_TOP_PX,
  MARGIN_BOTTOM_PX,
  MARGIN_LEFT_PX,
  MARGIN_RIGHT_PX,
  FONT_SIZE_PX,
  LINE_HEIGHT_PX,
  PRINTABLE_WIDTH_PX,
} from '@/lib/classic-editor/types';

interface TitlePageProps {
  metadata: TitlePageMetadata;
  onMetadataChange: (metadata: TitlePageMetadata) => void;
}

// Editable field component using contenteditable (same as script blocks)
interface EditableFieldProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  uppercase?: boolean;
}

function EditableField({ value, placeholder, onChange, className = '', style, multiline = false, uppercase = false }: EditableFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Initialize and sync external value changes
  useEffect(() => {
    if (ref.current && !isInternalChange.current) {
      const displayValue = uppercase ? value.toUpperCase() : value;
      // Only update if different to avoid cursor jumping
      if (ref.current.textContent !== displayValue) {
        ref.current.textContent = displayValue || '';
      }
    }
    isInternalChange.current = false;
  }, [value, uppercase]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      let text = ref.current.textContent || '';
      // For uppercase fields, store the original case but display uppercase
      if (uppercase) {
        text = text.toUpperCase();
      }
      isInternalChange.current = true;
      onChange(text);
    }
  }, [onChange, uppercase]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
  }, [multiline]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const processedText = multiline ? text : text.replace(/\n/g, ' ');
    document.execCommand('insertText', false, processedText);
  }, [multiline]);

  const isEmpty = !value;

  return (
    <div className="relative">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`outline-none ${className} ${isEmpty ? 'empty-field' : ''}`}
        style={style}
        data-placeholder={placeholder}
      />
      <style jsx>{`
        .empty-field:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground) / 0.4);
          pointer-events: none;
        }
        .empty-field:focus::before {
          color: hsl(var(--muted-foreground) / 0.3);
        }
      `}</style>
    </div>
  );
}

export function TitlePage({ metadata, onMetadataChange }: TitlePageProps) {
  const handleChange = useCallback((field: keyof TitlePageMetadata, value: string) => {
    onMetadataChange({
      ...metadata,
      [field]: value,
    });
  }, [metadata, onMetadataChange]);

  // Calculate vertical position for title (approximately 4" from top = ~25 lines)
  const titleTopPx = 384;
  const writtenByTopPx = titleTopPx + (LINE_HEIGHT_PX * 4);
  const authorTopPx = writtenByTopPx + (LINE_HEIGHT_PX * 2);

  // Common font styles for screenplay format
  const fontStyle: React.CSSProperties = {
    fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
    fontSize: `${FONT_SIZE_PX}px`,
    lineHeight: `${LINE_HEIGHT_PX}px`,
  };

  return (
    <div className="relative group">
      <div
        className="screenplay-page bg-card shadow-lg dark:shadow-2xl border border-border/50 relative"
        style={{
          width: `${PAGE_WIDTH_PX}px`,
          height: `${PAGE_HEIGHT_PX}px`,
          padding: `${MARGIN_TOP_PX}px ${MARGIN_RIGHT_PX}px ${MARGIN_BOTTOM_PX}px ${MARGIN_LEFT_PX}px`,
          ...fontStyle,
        }}
      >
        {/* Title - Centered, ~4" from top */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: `${titleTopPx}px` }}
        >
          <EditableField
            value={metadata.title}
            placeholder="UNTITLED"
            onChange={(v) => handleChange('title', v)}
            uppercase
            className="text-foreground text-center w-full cursor-text focus:bg-accent/20 rounded px-2 -mx-2 transition-colors"
            style={{
              ...fontStyle,
              maxWidth: `${PRINTABLE_WIDTH_PX}px`,
            }}
          />
        </div>

        {/* "Written by" - Static text */}
        <div
          className="absolute left-0 right-0 text-center text-foreground select-none"
          style={{
            top: `${writtenByTopPx}px`,
            ...fontStyle,
          }}
        >
          Written by
        </div>

        {/* Author Name */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: `${authorTopPx}px` }}
        >
          <EditableField
            value={metadata.author}
            placeholder="Author Name"
            onChange={(v) => handleChange('author', v)}
            className="text-foreground text-center w-full cursor-text focus:bg-accent/20 rounded px-2 -mx-2 transition-colors"
            style={{
              ...fontStyle,
              maxWidth: `${PRINTABLE_WIDTH_PX}px`,
            }}
          />
        </div>

        {/* Contact info - Bottom left */}
        <div
          className="absolute"
          style={{
            left: `${MARGIN_LEFT_PX}px`,
            bottom: `${MARGIN_BOTTOM_PX}px`,
            width: '280px',
          }}
        >
          <EditableField
            value={metadata.contact}
            placeholder="Contact info..."
            onChange={(v) => handleChange('contact', v)}
            multiline
            className="text-foreground cursor-text focus:bg-accent/20 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors whitespace-pre-wrap"
            style={fontStyle}
          />
        </div>

        {/* Date - Bottom right (optional, auto-filled) */}
        {metadata.date && (
          <div
            className="absolute text-foreground/60 select-none"
            style={{
              right: `${MARGIN_RIGHT_PX}px`,
              bottom: `${MARGIN_BOTTOM_PX}px`,
              ...fontStyle,
            }}
          >
            {metadata.date}
          </div>
        )}

        {/* Cover page indicator - subtle */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            Title Page
          </span>
        </div>
      </div>
    </div>
  );
}
