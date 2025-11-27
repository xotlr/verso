'use client';

import React, { useState } from 'react';
import { screenplayTemplates, TemplateType, Template } from '@/types/templates';
import { Film, Tv, Theater, FileText, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null);

  const templates = Object.values(screenplayTemplates);

  const getIcon = (type: TemplateType) => {
    switch (type) {
      case 'feature':
        return <Film className="h-8 w-8" />;
      case 'tv-sitcom':
      case 'tv-drama':
      case 'pilot':
        return <Tv className="h-8 w-8" />;
      case 'stage':
        return <Theater className="h-8 w-8" />;
      case 'short':
        return <Sparkles className="h-8 w-8" />;
      case 'blank':
        return <FileText className="h-8 w-8" />;
    }
  };

  const handleSelect = (template: Template) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card/50 sticky top-0 z-10">
          <DialogTitle className="text-2xl">Choose a Template</DialogTitle>
          <DialogDescription>
            Start with a professional industry-standard format
          </DialogDescription>
        </DialogHeader>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                onMouseEnter={() => setSelectedType(template.type)}
                onMouseLeave={() => setSelectedType(null)}
                className={`group relative p-6 rounded-xl border-2 transition-[border-color,box-shadow,background-color] duration-200 text-left ${
                  selectedType === template.type
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                {/* Icon */}
                <div className={`mb-4 ${
                  selectedType === template.type
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                } transition-colors`}>
                  {getIcon(template.type)}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>

                  {/* Metadata */}
                  <div className="pt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium text-foreground">
                        {template.metadata.format}
                      </span>
                    </div>
                    {template.metadata.pageCount && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Pages:</span>
                        <span className="font-medium text-foreground">
                          {template.metadata.pageCount}
                        </span>
                      </div>
                    )}
                    {template.metadata.actStructure && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Structure:</span>
                        <span className="font-medium text-foreground">
                          {template.metadata.actStructure}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  {template.metadata.features && template.metadata.features.length > 0 && (
                    <div className="pt-3 flex flex-wrap gap-1.5">
                      {template.metadata.features.slice(0, 3).map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover indicator */}
                {selectedType === template.type && (
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Not sure which template to choose?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Feature Film:</strong> For 90-120 minute theatrical releases</li>
              <li>• <strong>TV Drama:</strong> For one-hour episodic television</li>
              <li>• <strong>TV Sitcom:</strong> For half-hour comedy with multiple cameras</li>
              <li>• <strong>TV Pilot:</strong> For introducing a new series</li>
              <li>• <strong>Stage Play:</strong> For theatrical performances</li>
              <li>• <strong>Short Film:</strong> For films under 30 minutes</li>
              <li>• <strong>Blank:</strong> For complete creative freedom</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
