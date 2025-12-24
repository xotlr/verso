'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, Copy, Check, ExternalLink, Users, User, Building } from 'lucide-react';
import { toast } from 'sonner';
import type { CallsheetData, CrewMember } from '@/types/callsheet';

interface CallsheetShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callsheetId: string;
  callsheetTitle: string;
  callsheetData?: CallsheetData | null;
}

interface CreatedLink {
  id: string;
  token: string;
}

export function CallsheetShareDialog({
  open,
  onOpenChange,
  callsheetId,
  callsheetTitle,
  callsheetData,
}: CallsheetShareDialogProps) {
  const [filterType, setFilterType] = useState<'all' | 'department' | 'person'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [expiresIn, setExpiresIn] = useState<'never' | '1day' | '7days' | '30days'>('1day');
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract unique departments and people from callsheet data
  const departments = React.useMemo(() => {
    if (!callsheetData?.crew) return [];
    const depts = new Set(callsheetData.crew.map((c: CrewMember) => c.department));
    return Array.from(depts).sort();
  }, [callsheetData]);

  const crewMembers = React.useMemo(() => {
    if (!callsheetData?.crew) return [];
    return callsheetData.crew.map((c: CrewMember) => c.name).sort();
  }, [callsheetData]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFilterType('all');
      setFilterValue('');
      setExpiresIn('1day');
      setCreatedLink(null);
      setCopied(false);
    }
  }, [open]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = expiresIn === '1day' ? 1 : expiresIn === '7days' ? 7 : 30;
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const response = await fetch(`/api/callsheets/${callsheetId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterType,
          filterValue: filterValue || undefined,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create share link');
      }

      const { shareLink } = await response.json();
      setCreatedLink(shareLink);
      toast.success('Share link created');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    const url = `${window.location.origin}/callsheet/${createdLink.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    if (!createdLink) return;
    window.open(`/callsheet/${createdLink.token}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Callsheet</DialogTitle>
          <DialogDescription>
            Create a mobile-friendly link to share with cast & crew
          </DialogDescription>
        </DialogHeader>

        {!createdLink ? (
          <div className="space-y-4">
            {/* Filter Type */}
            <div className="space-y-2">
              <Label>View Type</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Full Callsheet
                    </div>
                  </SelectItem>
                  <SelectItem value="department">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      By Department
                    </div>
                  </SelectItem>
                  <SelectItem value="person">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Individual Crew
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Selector */}
            {filterType === 'department' && departments.length > 0 && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shows only crew from this department
                </p>
              </div>
            )}

            {/* Person Selector */}
            {filterType === 'person' && crewMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Crew Member</Label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewMembers.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shows only this person&apos;s call info
                </p>
              </div>
            )}

            {/* Expiration */}
            <div className="space-y-2">
              <Label>Expires</Label>
              <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as typeof expiresIn)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">In 1 day (recommended)</SelectItem>
                  <SelectItem value="7days">In 7 days</SelectItem>
                  <SelectItem value="30days">In 30 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Callsheet links should expire after the shoot day
              </p>
            </div>

            {/* Create Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || (filterType !== 'all' && !filterValue)}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">{callsheetTitle}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/callsheet/${createdLink.token}`}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleOpen}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
