'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogFormProps<T = void> {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description (optional) */
  description?: string;
  /** Form submission handler - return data on success, throw on error */
  onSubmit: () => Promise<T>;
  /** Called after successful submission with the result */
  onSuccess?: (result: T) => void;
  /** Called when dialog closes (cancel or after success) */
  onClose?: () => void;
  /** Submit button text (default: "Submit") */
  submitText?: string;
  /** Submit button text while loading (default: "Submitting...") */
  loadingText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Whether submit is disabled (in addition to loading state) */
  submitDisabled?: boolean;
  /** Max width class (default: "sm:max-w-[425px]") */
  maxWidth?: string;
  /** Form content */
  children: React.ReactNode;
  /** Additional footer content (rendered before buttons) */
  footerContent?: React.ReactNode;
  /** Custom class for dialog content */
  className?: string;
}

/**
 * Base component for dialog forms with consistent styling and behavior.
 * Handles loading state, error display, and form submission pattern.
 *
 * @example
 * ```tsx
 * <DialogForm
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Rename Project"
 *   description="Enter a new name for your project."
 *   onSubmit={async () => {
 *     const response = await fetch(`/api/projects/${id}`, {
 *       method: 'PUT',
 *       body: JSON.stringify({ name }),
 *     });
 *     if (!response.ok) throw new Error('Failed to rename');
 *     return response.json();
 *   }}
 *   onSuccess={() => toast.success('Project renamed')}
 *   submitText="Rename"
 *   loadingText="Renaming..."
 *   submitDisabled={!name.trim()}
 * >
 *   <div className="grid gap-2">
 *     <Label htmlFor="name">Project Name</Label>
 *     <Input
 *       id="name"
 *       value={name}
 *       onChange={(e) => setName(e.target.value)}
 *     />
 *   </div>
 * </DialogForm>
 * ```
 */
export function DialogForm<T = void>({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  onSuccess,
  onClose,
  submitText = 'Submit',
  loadingText = 'Submitting...',
  cancelText = 'Cancel',
  submitDisabled = false,
  maxWidth = 'sm:max-w-[425px]',
  children,
  footerContent,
  className,
}: DialogFormProps<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (isLoading) return; // Don't close while loading
    setError(null);
    onOpenChange(false);
    onClose?.();
  }, [isLoading, onOpenChange, onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await onSubmit();
      onSuccess?.(result);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit, onSuccess, handleClose]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      onOpenChange(true);
    }
  }, [handleClose, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(maxWidth, className)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {children}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            {footerContent}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || submitDisabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingText}
                </>
              ) : (
                submitText
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing dialog form state.
 * Provides controlled state for open/close and form values.
 */
export function useDialogForm<T extends Record<string, unknown>>(
  initialValues: T
) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<T>(initialValues);

  const openDialog = useCallback((overrides?: Partial<T>) => {
    setValues({ ...initialValues, ...overrides });
    setOpen(true);
  }, [initialValues]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    // Reset values after animation completes
    setTimeout(() => setValues(initialValues), 150);
  }, [initialValues]);

  const updateValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    open,
    setOpen,
    values,
    setValues,
    updateValue,
    openDialog,
    closeDialog,
  };
}
