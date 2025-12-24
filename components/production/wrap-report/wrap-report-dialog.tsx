'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { WrapReportView } from './wrap-report-view';

interface Callsheet {
  id: string;
  title: string;
  shootDate: string;
}

interface WrapReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle: string;
  callsheets?: Callsheet[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WrapReportData = any;

export function WrapReportDialog({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle,
  callsheets = [],
}: WrapReportDialogProps) {
  const [filterType, setFilterType] = useState<'all' | 'date' | 'callsheet'>('all');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCallsheet, setSelectedCallsheet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<WrapReportData | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType === 'date') {
        params.set('date', selectedDate);
      } else if (filterType === 'callsheet' && selectedCallsheet) {
        params.set('callsheetId', selectedCallsheet);
      }

      const response = await fetch(
        `/api/screenplays/${screenplayId}/wrap-report?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating wrap report:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate report'
      );
    } finally {
      setIsLoading(false);
    }
  }, [screenplayId, filterType, selectedDate, selectedCallsheet]);

  const handleExportText = useCallback(() => {
    if (!reportData) return;

    const lines: string[] = [];
    lines.push(`WRAP REPORT - ${reportData.screenplay.title}`);
    lines.push('='.repeat(50));
    lines.push('');

    if (reportData.callsheet) {
      lines.push(`Day: ${reportData.callsheet.title}`);
      lines.push(
        `Date: ${new Date(reportData.callsheet.shootDate).toLocaleDateString()}`
      );
      lines.push('');
    }

    lines.push('SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Shots Completed: ${reportData.summary.totalShots}`);
    lines.push(`Shots Approved: ${reportData.summary.approvedShots}`);
    lines.push(`Total Takes: ${reportData.summary.totalTakes}`);
    lines.push(`Avg Takes/Shot: ${reportData.summary.avgTakesPerShot}`);
    lines.push(`Scenes Worked: ${reportData.summary.scenesWorked}`);
    if (reportData.summary.flaggedShots > 0) {
      lines.push(`Flagged Shots: ${reportData.summary.flaggedShots}`);
    }
    lines.push('');

    lines.push('SCENE BREAKDOWN');
    lines.push('-'.repeat(30));

    for (const scene of reportData.scenes) {
      lines.push('');
      lines.push(`${scene.sceneName}`);
      lines.push(`  ${scene.completedShots} shots | ${scene.totalTakes} takes`);

      for (const shot of scene.shots) {
        const status = shot.status === 'approved' ? '[APPROVED]' : '';
        const flagged = shot.isFlagged ? '[FLAGGED]' : '';
        const circled = shot.circledTake ? `(Circle: ${shot.circledTake})` : '';
        lines.push(
          `    Shot ${shot.shotNumber}: ${shot.takeCount} takes ${circled} ${status} ${flagged}`.trim()
        );
        if (shot.quickNotes) {
          lines.push(`      Notes: ${shot.quickNotes}`);
        }
      }
    }

    lines.push('');
    lines.push('-'.repeat(30));
    lines.push(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`);

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wrap-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  }, [reportData]);

  const handleReset = useCallback(() => {
    setReportData(null);
    setFilterType('all');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedCallsheet('');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wrap Report</DialogTitle>
          <DialogDescription>
            {screenplayTitle}
          </DialogDescription>
        </DialogHeader>

        {!reportData ? (
          // Generation Form
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as typeof filterType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      All Completed Shots
                    </div>
                  </SelectItem>
                  <SelectItem value="date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      By Date
                    </div>
                  </SelectItem>
                  {callsheets.length > 0 && (
                    <SelectItem value="callsheet">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        By Callsheet
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {filterType === 'date' && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shows shots marked complete on this date
                </p>
              </div>
            )}

            {filterType === 'callsheet' && callsheets.length > 0 && (
              <div className="space-y-2">
                <Label>Callsheet</Label>
                <Select
                  value={selectedCallsheet}
                  onValueChange={setSelectedCallsheet}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a callsheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {callsheets.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        {cs.title} -{' '}
                        {new Date(cs.shootDate).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shows shots from scenes scheduled for this day
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={
                  isLoading ||
                  (filterType === 'callsheet' && !selectedCallsheet)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Report View
          <div className="space-y-4">
            <WrapReportView data={reportData} />

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                New Report
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportText}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Text
                </Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
