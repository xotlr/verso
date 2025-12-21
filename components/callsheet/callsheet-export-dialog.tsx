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
import { FileText, Printer, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CallsheetExportFormat } from '@/types/callsheet';

interface CallsheetExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callsheetId: string;
  callsheetTitle: string;
}

const EXPORT_OPTIONS: {
  format: CallsheetExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    format: 'html',
    label: 'View in Browser',
    description: 'Open a print-ready HTML page in a new tab',
    icon: ExternalLink,
  },
  {
    format: 'pdf',
    label: 'Print / Save as PDF',
    description: 'Opens print dialog to save as PDF or print directly',
    icon: Printer,
  },
  {
    format: 'txt',
    label: 'Plain Text',
    description: 'Download as a text file for email or SMS',
    icon: FileText,
  },
];

export function CallsheetExportDialog({
  open,
  onOpenChange,
  callsheetId,
  callsheetTitle,
}: CallsheetExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<CallsheetExportFormat>('html');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = `/api/callsheets/${callsheetId}/export?format=${selectedFormat}`;

      if (selectedFormat === 'txt') {
        // Download text file
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${callsheetTitle.replace(/[^a-zA-Z0-9]/g, '_')}_callsheet.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      } else if (selectedFormat === 'pdf') {
        // Open in new tab and trigger print
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // Open HTML in new tab
        window.open(url, '_blank');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Callsheet</DialogTitle>
          <DialogDescription className="text-sm">
            Choose how you want to export &ldquo;{callsheetTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedFormat === option.format;

            return (
              <button
                key={option.format}
                onClick={() => setSelectedFormat(option.format)}
                className={cn(
                  'w-full p-4 rounded-lg border text-left transition-all duration-200',
                  'hover:border-primary/50 hover:bg-primary/5',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                      isSelected ? 'border-primary' : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
