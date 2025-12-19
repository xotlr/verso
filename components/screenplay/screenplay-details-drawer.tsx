'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { FileText, Info, User } from 'lucide-react';

interface TitlePageFields {
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  copyrightYear?: number | null;
  copyrightHolder?: string | null;
  registrationNumber?: string | null;
  draftLabel?: string | null;
  draftDate?: string | null; // ISO date string
  showTitlePageContact?: boolean;
  showTitlePageCopyright?: boolean;
  showTitlePageDraft?: boolean;
}

interface ScreenplayDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  screenplayId: string;
  logline?: string | null;
  genre?: string | null;
  author?: string | null;
  type?: 'FILM' | 'TV';
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
  titlePageFields?: TitlePageFields;
}

export function ScreenplayDetailsDrawer({
  isOpen,
  onClose,
  screenplayId,
  logline,
  genre,
  author,
  type,
  season,
  episode,
  episodeTitle,
  titlePageFields,
}: ScreenplayDetailsDrawerProps) {
  const [localType, setLocalType] = useState(type || 'FILM');
  const [localSeason, setLocalSeason] = useState(season || 1);
  const [localEpisode, setLocalEpisode] = useState(episode || 1);
  const [activeTab, setActiveTab] = useState('details');

  // Title page state
  const [titlePage, setTitlePage] = useState<TitlePageFields>({
    contactName: titlePageFields?.contactName ?? null,
    contactEmail: titlePageFields?.contactEmail ?? null,
    contactPhone: titlePageFields?.contactPhone ?? null,
    contactAddress: titlePageFields?.contactAddress ?? null,
    copyrightYear: titlePageFields?.copyrightYear ?? new Date().getFullYear(),
    copyrightHolder: titlePageFields?.copyrightHolder ?? null,
    registrationNumber: titlePageFields?.registrationNumber ?? null,
    draftLabel: titlePageFields?.draftLabel ?? 'First Draft',
    draftDate: titlePageFields?.draftDate ?? new Date().toISOString().split('T')[0],
    showTitlePageContact: titlePageFields?.showTitlePageContact ?? true,
    showTitlePageCopyright: titlePageFields?.showTitlePageCopyright ?? true,
    showTitlePageDraft: titlePageFields?.showTitlePageDraft ?? true,
  });

  // Sync local state when props change
  useEffect(() => {
    setLocalSeason(season || 1);
    setLocalEpisode(episode || 1);
  }, [season, episode]);

  // Sync title page state when props change
  useEffect(() => {
    if (titlePageFields) {
      setTitlePage(prev => ({
        ...prev,
        ...titlePageFields,
      }));
    }
  }, [titlePageFields]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = async (field: string, value: any) => {
    try {
      await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTitlePageField = async (field: keyof TitlePageFields, value: any) => {
    setTitlePage(prev => ({ ...prev, [field]: value }));
    await updateField(field, value);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Screenplay Details</SheetTitle>
          <SheetDescription>
            Manage screenplay information and metadata
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="titlepage" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Title Page
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-6">
              {/* Primary Info Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Primary Info
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="logline">Logline</Label>
                    <Textarea
                      id="logline"
                      placeholder="A brief one-sentence description..."
                      className="resize-none h-24"
                      defaultValue={logline || ''}
                      onBlur={(e) => updateField('logline', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="genre">Genre</Label>
                      <Input
                        id="genre"
                        placeholder="e.g., Drama"
                        defaultValue={genre || ''}
                        onBlur={(e) => updateField('genre', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="author">Author</Label>
                      <Input
                        id="author"
                        placeholder="Written by..."
                        defaultValue={author || ''}
                        onBlur={(e) => updateField('author', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Type & Episode Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Format
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={localType}
                      onValueChange={(val) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setLocalType(val as any);
                        updateField('type', val);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FILM">Film</SelectItem>
                        <SelectItem value="TV">TV Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {localType === 'TV' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="season">Season</Label>
                          <NumberInput
                            id="season"
                            value={localSeason}
                            onChange={(value) => {
                              setLocalSeason(value);
                              updateField('season', value);
                            }}
                            min={1}
                            max={99}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="episode">Episode</Label>
                          <NumberInput
                            id="episode"
                            value={localEpisode}
                            onChange={(value) => {
                              setLocalEpisode(value);
                              updateField('episode', value);
                            }}
                            min={1}
                            max={999}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="episodeTitle">Episode Title</Label>
                        <Input
                          id="episodeTitle"
                          defaultValue={episodeTitle || ''}
                          onBlur={(e) => updateField('episodeTitle', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>
            </TabsContent>

            {/* Title Page Tab */}
            <TabsContent value="titlepage" className="mt-4 space-y-6">
              {/* Contact Information */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Contact Information
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showContact" className="text-xs text-muted-foreground">Show</Label>
                    <Switch
                      id="showContact"
                      checked={titlePage.showTitlePageContact ?? true}
                      onCheckedChange={(checked) => updateTitlePageField('showTitlePageContact', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Name</Label>
                    <Input
                      id="contactName"
                      placeholder="Your name or company"
                      value={titlePage.contactName || ''}
                      onChange={(e) => setTitlePage(prev => ({ ...prev, contactName: e.target.value }))}
                      onBlur={(e) => updateTitlePageField('contactName', e.target.value || null)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={titlePage.contactEmail || ''}
                        onChange={(e) => setTitlePage(prev => ({ ...prev, contactEmail: e.target.value }))}
                        onBlur={(e) => updateTitlePageField('contactEmail', e.target.value || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={titlePage.contactPhone || ''}
                        onChange={(e) => setTitlePage(prev => ({ ...prev, contactPhone: e.target.value }))}
                        onBlur={(e) => updateTitlePageField('contactPhone', e.target.value || null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactAddress">Address</Label>
                    <Textarea
                      id="contactAddress"
                      placeholder="Street address&#10;City, State ZIP"
                      className="resize-none h-20"
                      value={titlePage.contactAddress || ''}
                      onChange={(e) => setTitlePage(prev => ({ ...prev, contactAddress: e.target.value }))}
                      onBlur={(e) => updateTitlePageField('contactAddress', e.target.value || null)}
                    />
                  </div>
                </div>
              </section>

              {/* Copyright & Registration */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Copyright & Registration
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showCopyright" className="text-xs text-muted-foreground">Show</Label>
                    <Switch
                      id="showCopyright"
                      checked={titlePage.showTitlePageCopyright ?? true}
                      onCheckedChange={(checked) => updateTitlePageField('showTitlePageCopyright', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="copyrightYear">Year</Label>
                      <NumberInput
                        id="copyrightYear"
                        value={titlePage.copyrightYear ?? new Date().getFullYear()}
                        onChange={(value) => updateTitlePageField('copyrightYear', value)}
                        min={1900}
                        max={2100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copyrightHolder">Holder</Label>
                      <Input
                        id="copyrightHolder"
                        placeholder="Copyright owner"
                        value={titlePage.copyrightHolder || ''}
                        onChange={(e) => setTitlePage(prev => ({ ...prev, copyrightHolder: e.target.value }))}
                        onBlur={(e) => updateTitlePageField('copyrightHolder', e.target.value || null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="WGA# or Copyright registration"
                      value={titlePage.registrationNumber || ''}
                      onChange={(e) => setTitlePage(prev => ({ ...prev, registrationNumber: e.target.value }))}
                      onBlur={(e) => updateTitlePageField('registrationNumber', e.target.value || null)}
                    />
                  </div>
                </div>
              </section>

              {/* Draft Information */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Draft Information
                  </h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="showDraft" className="text-xs text-muted-foreground">Show</Label>
                    <Switch
                      id="showDraft"
                      checked={titlePage.showTitlePageDraft ?? true}
                      onCheckedChange={(checked) => updateTitlePageField('showTitlePageDraft', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="draftLabel">Draft Label</Label>
                      <Select
                        value={titlePage.draftLabel || 'First Draft'}
                        onValueChange={(val) => updateTitlePageField('draftLabel', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First Draft">First Draft</SelectItem>
                          <SelectItem value="Second Draft">Second Draft</SelectItem>
                          <SelectItem value="Third Draft">Third Draft</SelectItem>
                          <SelectItem value="Revised Draft">Revised Draft</SelectItem>
                          <SelectItem value="Final Draft">Final Draft</SelectItem>
                          <SelectItem value="Shooting Draft">Shooting Draft</SelectItem>
                          <SelectItem value="Production Draft">Production Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="draftDate">Date</Label>
                      <Input
                        id="draftDate"
                        type="date"
                        value={titlePage.draftDate || ''}
                        onChange={(e) => updateTitlePageField('draftDate', e.target.value || null)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
