"use client";

import { useState, useEffect } from "react";
import {
  Shot,
  SHOT_TYPES,
  CAMERA_ANGLES,
  CAMERA_MOVEMENTS,
  SHOT_STATUSES,
  SHOT_TYPE_LABELS,
  CAMERA_ANGLE_LABELS,
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
import { Minus, Plus } from "lucide-react";

interface ShotEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shot: Shot | null;
  onSave: (shot: Partial<Shot>) => void;
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
    }
  }, [shot, open]);

  const handleSave = () => {
    if (!description.trim()) return;

    onSave({
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
      status,
    });
  };

  const adjustDuration = (delta: number) => {
    setDuration((prev) => {
      const newVal = (prev || 0) + delta;
      return newVal > 0 ? newVal : null;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shot ? "Edit Shot" : "New Shot"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
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
                        {CAMERA_ANGLE_LABELS[angle]}
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
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!description.trim()}>
            {shot ? "Save Changes" : "Add Shot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
