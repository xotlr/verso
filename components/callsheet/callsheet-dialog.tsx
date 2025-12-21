'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Film, AlertTriangle, Save, X } from 'lucide-react';
import { CallsheetStatus, CallsheetCreateInput, CallsheetCardData } from '@/types/callsheet';

interface CallsheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callsheet?: CallsheetCardData | null;
  projectId: string; // Reserved for future use
  onSave: (data: CallsheetCreateInput) => Promise<void>;
  isSaving?: boolean;
}

export function CallsheetDialog({
  open,
  onOpenChange,
  callsheet,
  projectId: _projectId,
  onSave,
  isSaving = false,
}: CallsheetDialogProps) {
  // projectId reserved for future features (e.g., loading screenplay scenes)
  void _projectId;
  const isEditing = !!callsheet;
  const [activeTab, setActiveTab] = useState('basic');

  // Form state
  const [title, setTitle] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [callTime, setCallTime] = useState('06:00');
  const [wrapTime, setWrapTime] = useState('');
  const [status, setStatus] = useState<CallsheetStatus>('DRAFT');
  const [primaryLocation, setPrimaryLocation] = useState('');
  const [weatherForecast, setWeatherForecast] = useState('');
  const [weatherTemp, setWeatherTemp] = useState('');

  // Reset form when dialog opens/closes or callsheet changes
  useEffect(() => {
    if (open && callsheet) {
      // Editing existing callsheet
      setTitle(callsheet.title);
      setShootDate(new Date(callsheet.shootDate).toISOString().split('T')[0]);
      setCallTime(new Date(callsheet.callTime).toTimeString().slice(0, 5));
      setWrapTime(callsheet.wrapTime ? new Date(callsheet.wrapTime).toTimeString().slice(0, 5) : '');
      setStatus(callsheet.status);
      setPrimaryLocation(callsheet.primaryLocation || '');
      setWeatherForecast(callsheet.weatherForecast || '');
      setWeatherTemp(callsheet.weatherTemp?.toString() || '');
    } else if (open && !callsheet) {
      // Creating new callsheet
      setTitle('');
      setShootDate(new Date().toISOString().split('T')[0]);
      setCallTime('06:00');
      setWrapTime('');
      setStatus('DRAFT');
      setPrimaryLocation('');
      setWeatherForecast('');
      setWeatherTemp('');
    }
    setActiveTab('basic');
  }, [open, callsheet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine date and time
    const shootDateTime = new Date(`${shootDate}T${callTime}:00`);
    const callDateTime = new Date(`${shootDate}T${callTime}:00`);
    const wrapDateTime = wrapTime ? new Date(`${shootDate}T${wrapTime}:00`) : null;

    // If wrap time is before call time, assume it's next day
    if (wrapDateTime && wrapDateTime < callDateTime) {
      wrapDateTime.setDate(wrapDateTime.getDate() + 1);
    }

    const data: CallsheetCreateInput = {
      title,
      shootDate: shootDateTime.toISOString(),
      callTime: callDateTime.toISOString(),
      wrapTime: wrapDateTime?.toISOString() || undefined,
      status,
      primaryLocation: primaryLocation || undefined,
      weatherForecast: weatherForecast || undefined,
      weatherTemp: weatherTemp ? parseFloat(weatherTemp) : undefined,
    };

    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Callsheet' : 'Create Callsheet'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Location</span>
              </TabsTrigger>
              <TabsTrigger value="weather" className="gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Weather</span>
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-1.5 text-xs">
                <Film className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Day 1 - INT. OFFICE SCENES"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shootDate">Shoot Date</Label>
                  <Input
                    id="shootDate"
                    type="date"
                    value={shootDate}
                    onChange={(e) => setShootDate(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="callTime">Call Time</Label>
                    <Input
                      id="callTime"
                      type="time"
                      value={callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wrapTime">Est. Wrap</Label>
                    <Input
                      id="wrapTime"
                      type="time"
                      value={wrapTime}
                      onChange={(e) => setWrapTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="primaryLocation">Primary Location</Label>
                <Input
                  id="primaryLocation"
                  value={primaryLocation}
                  onChange={(e) => setPrimaryLocation(e.target.value)}
                  placeholder="123 Main St, Los Angeles, CA"
                />
                <p className="text-xs text-muted-foreground">
                  The main filming location for this day. You can add more locations in the full callsheet data.
                </p>
              </div>
            </TabsContent>

            {/* Weather Tab */}
            <TabsContent value="weather" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weatherForecast">Forecast</Label>
                  <Input
                    id="weatherForecast"
                    value={weatherForecast}
                    onChange={(e) => setWeatherForecast(e.target.value)}
                    placeholder="Sunny, clear skies"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weatherTemp">Temperature (F)</Label>
                  <Input
                    id="weatherTemp"
                    type="number"
                    value={weatherTemp}
                    onChange={(e) => setWeatherTemp(e.target.value)}
                    placeholder="75"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CallsheetStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-500" />
                        Draft
                      </span>
                    </SelectItem>
                    <SelectItem value="PUBLISHED">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Published
                      </span>
                    </SelectItem>
                    <SelectItem value="COMPLETED">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Completed
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Draft callsheets are only visible to you. Published callsheets can be shared with the crew.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !title || !shootDate}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Callsheet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
