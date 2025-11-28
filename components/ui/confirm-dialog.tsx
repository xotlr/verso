'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              variant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage with state management
import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

interface UseConfirmDialogReturn {
  isOpen: boolean;
  confirm: (onConfirm: () => void) => void;
  close: () => void;
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
  };
}

export function useConfirmDialog(options: UseConfirmDialogOptions): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<(() => void) | null>(null);

  const confirm = useCallback((onConfirm: () => void) => {
    setPendingConfirm(() => onConfirm);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPendingConfirm(null);
  }, []);

  const handleConfirm = useCallback(() => {
    pendingConfirm?.();
    close();
  }, [pendingConfirm, close]);

  return {
    isOpen,
    confirm,
    close,
    dialogProps: {
      open: isOpen,
      onOpenChange: setIsOpen,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      variant: options.variant,
      onConfirm: handleConfirm,
    },
  };
}
