'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { screenplayTypes } from '@/types/templates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTemplateSelectorState } from '@/hooks/use-template-selector-state';
import { TypeSelectionCards } from './type-selection-cards';
import { DetailsForm } from './details-form';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function TemplateSelector({ isOpen, onClose, projectId }: TemplateSelectorProps) {
  const state = useTemplateSelectorState({ isOpen, onClose, projectId });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && state.handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Create New Screenplay
          </DialogTitle>
          <DialogDescription>
            {state.selectedType
              ? `Set up your ${screenplayTypes[state.selectedType].name.toLowerCase()}`
              : 'Choose a type to get started'}
          </DialogDescription>
        </DialogHeader>

        {/* Type Selection Cards */}
        <TypeSelectionCards
          selectedType={state.selectedType}
          onTypeSelect={state.handleTypeSelect}
        />

        {/* Form Fields - Progressive Disclosure */}
        <AnimatePresence mode="wait">
          {state.selectedType && (
            <motion.div
              key={state.selectedType}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4 border-t border-border/40 pt-4">
                <DetailsForm
                  type={state.selectedType}
                  formData={state.formData}
                  updateField={state.updateField}
                  firstInputRef={state.firstInputRef}
                  seriesList={state.seriesList}
                  selectedSeriesId={state.selectedSeriesId}
                  setSelectedSeriesId={state.setSelectedSeriesId}
                  isCreatingNewSeries={state.isCreatingNewSeries}
                  setIsCreatingNewSeries={state.setIsCreatingNewSeries}
                  newSeriesTitle={state.newSeriesTitle}
                  setNewSeriesTitle={state.setNewSeriesTitle}
                  newSeriesGenre={state.newSeriesGenre}
                  setNewSeriesGenre={state.setNewSeriesGenre}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={state.handleClose}
            disabled={state.isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={state.handleCreate}
            disabled={!state.canCreate() || state.isCreating}
          >
            {state.isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Screenplay'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
