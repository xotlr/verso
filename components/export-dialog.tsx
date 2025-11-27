'use client';

import React, { useState } from 'react';
import { Download, FileText, File, Code, Globe, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Scene } from '@/types/screenplay';
import { SceneNumbering, RevisionColor } from '@/types/production';
import {
  exportToFountain,
  exportToFDX,
  exportToHTML,
  exportToPlainText,
  downloadFile,
} from '@/lib/export-utils';
import { toast } from 'sonner';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  author: string;
  content: string;
  scenes: Scene[];
  sceneNumbering: SceneNumbering;
  revisionColor: RevisionColor;
}

type ExportFormat = 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html';

export function ExportDialog({
  isOpen,
  onClose,
  title,
  author,
  content,
  scenes,
  sceneNumbering,
  revisionColor,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [includeSceneNumbers, setIncludeSceneNumbers] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('DRAFT');
  const [isExporting, setIsExporting] = useState(false);

  const formats: Array<{
    id: ExportFormat;
    name: string;
    description: string;
    icon: React.ReactNode;
    extension: string;
  }> = [
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Universal format for sharing and printing',
      icon: <FileText className="h-5 w-5" />,
      extension: '.pdf',
    },
    {
      id: 'fdx',
      name: 'Final Draft',
      description: 'Compatible with Final Draft software',
      icon: <File className="h-5 w-5" />,
      extension: '.fdx',
    },
    {
      id: 'fountain',
      name: 'Fountain',
      description: 'Plain text screenplay format',
      icon: <Code className="h-5 w-5" />,
      extension: '.fountain',
    },
    {
      id: 'html',
      name: 'HTML',
      description: 'Web page for online viewing',
      icon: <Globe className="h-5 w-5" />,
      extension: '.html',
    },
    {
      id: 'txt',
      name: 'Plain Text',
      description: 'Simple text file',
      icon: <FileText className="h-5 w-5" />,
      extension: '.txt',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      switch (selectedFormat) {
        case 'pdf':
          // Generate HTML and trigger print (browser will handle PDF)
          const pdfHTML = exportToHTML(title, author, content, revisionColor);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(pdfHTML);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
            }, 250);
          }
          break;

        case 'fdx':
          const fdx = exportToFDX(title, author, content, scenes, sceneNumbering);
          downloadFile(fdx, `${filename}.fdx`, 'application/xml');
          break;

        case 'fountain':
          const fountainMetadata: Record<string, string> = {
            'Draft date': new Date().toLocaleDateString(),
          };
          if (revisionColor !== 'white') {
            fountainMetadata['Revision'] = revisionColor;
          }
          const fountain = exportToFountain(title, author, content, fountainMetadata);
          downloadFile(fountain, `${filename}.fountain`, 'text/plain');
          break;

        case 'html':
          const html = exportToHTML(title, author, content, revisionColor);
          downloadFile(html, `${filename}.html`, 'text/html');
          break;

        case 'txt':
          const txt = exportToPlainText(content);
          downloadFile(txt, `${filename}.txt`, 'text/plain');
          break;
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card/50">
          <DialogTitle className="text-2xl">Export Screenplay</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Choose Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                    selectedFormat === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 ${
                        selectedFormat === format.id ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {format.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-foreground">{format.name}</h4>
                        {selectedFormat === format.id && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{format.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {format.extension}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="text-sm font-semibold">Export Options</h3>

            {selectedFormat !== 'txt' && (
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Include Scene Numbers</label>
                  <p className="text-xs text-muted-foreground">
                    Add scene numbers to the exported file
                  </p>
                </div>
                <Checkbox
                  checked={includeSceneNumbers}
                  onCheckedChange={(checked) => setIncludeSceneNumbers(checked as boolean)}
                />
              </div>
            )}

            {selectedFormat === 'pdf' && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Add Watermark</label>
                    <p className="text-xs text-muted-foreground">
                      Add a watermark to each page
                    </p>
                  </div>
                  <Checkbox
                    checked={includeWatermark}
                    onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
                  />
                </div>

                {includeWatermark && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Watermark Text</label>
                    <Input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="DRAFT"
                    />
                  </div>
                )}
              </>
            )}

            {revisionColor !== 'white' && (selectedFormat === 'pdf' || selectedFormat === 'html') && (
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <div
                  className={`w-4 h-4 rounded ${
                    revisionColor === 'blue' ? 'bg-blue-400' :
                    revisionColor === 'pink' ? 'bg-pink-400' :
                    revisionColor === 'yellow' ? 'bg-yellow-300' :
                    revisionColor === 'green' ? 'bg-green-400' :
                    revisionColor === 'goldenrod' ? 'bg-yellow-600' :
                    revisionColor === 'buff' ? 'bg-orange-200' :
                    revisionColor === 'salmon' ? 'bg-orange-300' :
                    'bg-card border-2 border-border'
                  }`}
                />
                <div className="text-sm">
                  <p className="font-medium">Revision Color: {revisionColor}</p>
                  <p className="text-xs text-muted-foreground">
                    This will be included in the export
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>File name:</strong>{' '}
              <span className="font-mono">
                {title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}
                {formats.find(f => f.id === selectedFormat)?.extension}
              </span>
            </p>
            <p className="mt-1">
              <strong>Scenes:</strong> {scenes.length} • <strong>Format:</strong> {formats.find(f => f.id === selectedFormat)?.name}
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between gap-3 p-6 border-t border-border bg-card/50">
          <p className="text-xs text-muted-foreground">
            {selectedFormat === 'pdf' ? 'Opens print dialog' : 'Downloads file'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="min-w-[100px]">
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
