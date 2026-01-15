"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shot,
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
  SHOT_TYPE_LABELS,
  CAMERA_ANGLE_LABELS,
  CAMERA_ANGLE_DESCRIPTIONS,
  CAMERA_MOVEMENT_LABELS,
  SHOT_STATUS_LABELS,
  COMMON_LENSES,
  ShotType,
  CameraAngle,
  CameraMovement,
  ShotStatus,
} from "@/types/shotlist";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Upload, Link2, X, ImageIcon, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface ShotEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shot: Shot | null;
  onSave: (shot: Partial<Shot>) => Promise<void>;
}

const NONE_VALUE = "__none__";

export function ShotEditor({
  open,
  onOpenChange,
  shot,
  onSave,
}: ShotEditorProps) {
  const [description, setDescription] = useState("");
  const [shotType, setShotType] = useState<string>(NONE_VALUE);
  const [cameraAngle, setCameraAngle] = useState<string>(NONE_VALUE);
  const [movement, setMovement] = useState<string>(NONE_VALUE);
  const [duration, setDuration] = useState<number | null>(null);
  const [lens, setLens] = useState("");
  const [equipment, setEquipment] = useState("");
  const [lighting, setLighting] = useState("");
  const [audio, setAudio] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShotStatus>("planned");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailType, setThumbnailType] = useState<'upload' | 'url' | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when shot changes
  useEffect(() => {
    if (shot) {
      setDescription(shot.description);
      setShotType(shot.shotType || NONE_VALUE);
      setCameraAngle(shot.cameraAngle || NONE_VALUE);
      setMovement(shot.movement || NONE_VALUE);
      setDuration(shot.duration);
      setLens(shot.lens || "");
      setEquipment(shot.equipment || "");
      setLighting(shot.lighting || "");
      setAudio(shot.audio || "");
      setNotes(shot.notes || "");
      setStatus(shot.status);
      setThumbnailUrl(shot.thumbnailUrl || "");
      setThumbnailType(shot.thumbnailType || null);
      setImageInputMode(shot.thumbnailType || 'upload');
    } else {
      // Reset for new shot
      setDescription("");
      setShotType(NONE_VALUE);
      setCameraAngle(NONE_VALUE);
      setMovement(NONE_VALUE);
      setDuration(null);
      setLens("");
      setEquipment("");
      setLighting("");
      setAudio("");
      setNotes("");
      setStatus("planned");
      setThumbnailUrl("");
      setThumbnailType(null);
      setImageInputMode('upload');
    }
  }, [shot, open]);

  const handleSave = async () => {
    if (!description.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        description: description.trim(),
        shotType: shotType === NONE_VALUE ? null : (shotType as ShotType),
        cameraAngle: cameraAngle === NONE_VALUE ? null : (cameraAngle as CameraAngle),
        movement: movement === NONE_VALUE ? null : (movement as CameraMovement),
        duration: duration,
        lens: lens.trim() || null,
        equipment: equipment.trim() || null,
        lighting: lighting.trim() || null,
        audio: audio.trim() || null,
        notes: notes.trim() || null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        thumbnailType: thumbnailUrl.trim() ? thumbnailType : null,
        status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save shot";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearImage = () => {
    setThumbnailUrl("");
    setThumbnailType(null);
  };

  const handleUrlPaste = (url: string) => {
    setThumbnailUrl(url);
    setThumbnailType('url');
  };

  const adjustDuration = (delta: number) => {
    setDuration((prev) => {
      const newVal = (prev || 0) + delta;
      return newVal > 0 ? newVal : null;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{shot ? "Edit Shot" : "New Shot"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happens in this shot..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ShotStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SHOT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustDuration(-1)}
                    disabled={!duration || duration <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="duration"
                    type="number"
                    value={duration || ""}
                    onChange={(e) =>
                      setDuration(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="--"
                    className="text-center"
                    min={1}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustDuration(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this shot..."
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Camera Tab */}
          <TabsContent value="camera" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shotType">Shot Type</Label>
                <Select value={shotType} onValueChange={setShotType}>
                  <SelectTrigger id="shotType">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {SHOT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SHOT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cameraAngle">Camera Angle</Label>
                <Select value={cameraAngle} onValueChange={setCameraAngle}>
                  <SelectTrigger id="cameraAngle">
                    <SelectValue placeholder="Select angle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {CAMERA_ANGLES.map((angle) => (
                      <SelectItem key={angle} value={angle}>
                        <div className="flex flex-col gap-0.5">
                          <span>{CAMERA_ANGLE_LABELS[angle]}</span>
                          <span className="text-xs text-muted-foreground">
                            {CAMERA_ANGLE_DESCRIPTIONS[angle]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="movement">Camera Movement</Label>
                <Select value={movement} onValueChange={setMovement}>
                  <SelectTrigger id="movement">
                    <SelectValue placeholder="Select movement..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {CAMERA_MOVEMENTS.map((mov) => (
                      <SelectItem key={mov} value={mov}>
                        {CAMERA_MOVEMENT_LABELS[mov]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lens">Lens</Label>
                <Select
                  value={lens || NONE_VALUE}
                  onValueChange={(v) => setLens(v === NONE_VALUE ? "" : v)}
                >
                  <SelectTrigger id="lens">
                    <SelectValue placeholder="Select lens..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {COMMON_LENSES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Textarea
                id="equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Camera, rig, special equipment needed..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lighting">Lighting</Label>
              <Textarea
                id="lighting"
                value={lighting}
                onChange={(e) => setLighting(e.target.value)}
                placeholder="Lighting setup and requirements..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">Audio</Label>
              <Textarea
                id="audio"
                value={audio}
                onChange={(e) => setAudio(e.target.value)}
                placeholder="Audio/sound requirements..."
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Storyboard Tab */}
          <TabsContent value="storyboard" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Label>Storyboard Image</Label>

              {/* Image Preview */}
              {thumbnailUrl ? (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                  <Image
                    src={thumbnailUrl}
                    alt="Storyboard frame"
                    fill
                    className="object-contain"
                    unoptimized={thumbnailType === 'url'}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleClearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-50" />
                  <p className="text-sm">No storyboard image</p>
                </div>
              )}

              {/* Input Mode Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={imageInputMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageInputMode('url')}
                  className="flex-1"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Paste URL
                </Button>
                <Button
                  type="button"
                  variant={imageInputMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageInputMode('upload')}
                  className="flex-1"
                  disabled
                  title="Upload coming soon"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>

              {/* URL Input */}
              {imageInputMode === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => handleUrlPaste(e.target.value)}
                    placeholder="https://example.com/storyboard.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a direct link to an image (JPG, PNG, GIF)
                  </p>
                </div>
              )}

              {/* Upload placeholder - disabled for now */}
              {imageInputMode === 'upload' && (
                <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Image upload coming soon</p>
                  <p className="text-xs mt-1">Use URL paste for now</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!description.trim() || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {shot ? "Save Changes" : "Add Shot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
