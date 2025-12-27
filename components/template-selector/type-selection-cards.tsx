'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Film, Tv, FileText, Check } from 'lucide-react';
import { screenplayTypes, ScreenplayTypeId } from '@/types/templates';
import { cn } from '@/lib/utils';

const typeOrder: ScreenplayTypeId[] = ['film', 'tv-series', 'blank'];

const iconComponents = {
  Film,
  Tv,
  FileText,
};

const typeIconColors: Record<ScreenplayTypeId, string> = {
  'film': 'text-amber-500',
  'tv-series': 'text-blue-500',
  'blank': 'text-muted-foreground',
};

interface TypeSelectionCardsProps {
  selectedType: ScreenplayTypeId | null;
  onTypeSelect: (type: ScreenplayTypeId) => void;
}

export function TypeSelectionCards({
  selectedType,
  onTypeSelect,
}: TypeSelectionCardsProps) {
  return (
    <div className="px-6 pb-4">
      <div className="grid grid-cols-3 gap-3">
        {typeOrder.map((typeId, index) => {
          const typeConfig = screenplayTypes[typeId];
          const IconComponent = iconComponents[typeConfig.iconName];
          const isSelected = selectedType === typeId;
          const iconColor = typeIconColors[typeId];

          return (
            <motion.button
              key={typeId}
              onClick={() => onTypeSelect(typeId)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group relative p-5 rounded-xl border transition-all duration-200 text-left',
                'min-h-[130px] flex flex-col',
                'hover:-translate-y-0.5 active:scale-[0.98]',
                isSelected
                  ? 'border-primary bg-accent/50 shadow-sm'
                  : 'border-border/60 hover:border-border hover:bg-accent/30'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-200',
                  'bg-muted/50'
                )}
              >
                <IconComponent
                  className={cn(
                    'h-6 w-6 transition-all duration-200',
                    iconColor,
                    'group-hover:scale-105'
                  )}
                />
              </div>

              {/* Text */}
              <h3 className="font-medium text-sm mb-1">{typeConfig.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">
                {typeConfig.description}
              </p>

              {/* Check indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    className="absolute top-2.5 right-2.5"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
