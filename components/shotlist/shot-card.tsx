"use client";

import {
  Shot,
  SHOT_TYPE_LABELS,
  CAMERA_ANGLE_LABELS,
  CAMERA_MOVEMENT_LABELS,
  SHOT_STATUS_LABELS,
  SHOT_STATUS_COLORS,
  ShotType,
  CameraAngle,
  CameraMovement,
  ShotStatus,
} from "@/types/shotlist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Camera,
  Move,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShotCardProps {
  shot: Shot;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function ShotCard({
  shot,
  onEdit,
  onDelete,
  onDuplicate,
}: ShotCardProps) {
  const statusColor = SHOT_STATUS_COLORS[shot.status as ShotStatus] || SHOT_STATUS_COLORS.planned;
  const statusLabel = SHOT_STATUS_LABELS[shot.status as ShotStatus] || shot.status;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border",
        "bg-card hover:bg-accent/50 transition-colors"
      )}
    >
      {/* Shot number */}
      <div className="flex-shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
        <span className="text-sm font-medium">{shot.shotNumber}</span>
      </div>

      {/* Shot content */}
      <div className="flex-1 min-w-0">
        {/* Description */}
        <p className="text-sm line-clamp-2">{shot.description}</p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Status badge */}
          <Badge variant="secondary" className={cn("text-xs", statusColor)}>
            {statusLabel}
          </Badge>

          {/* Shot type */}
          {shot.shotType && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera className="h-3 w-3" />
              <span>
                {SHOT_TYPE_LABELS[shot.shotType as ShotType] || shot.shotType}
              </span>
            </div>
          )}

          {/* Camera angle */}
          {shot.cameraAngle && (
            <span className="text-xs text-muted-foreground">
              {CAMERA_ANGLE_LABELS[shot.cameraAngle as CameraAngle] ||
                shot.cameraAngle}
            </span>
          )}

          {/* Movement */}
          {shot.movement && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Move className="h-3 w-3" />
              <span>
                {CAMERA_MOVEMENT_LABELS[shot.movement as CameraMovement] ||
                  shot.movement}
              </span>
            </div>
          )}

          {/* Duration */}
          {shot.duration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{shot.duration}s</span>
            </div>
          )}

          {/* Lens */}
          {shot.lens && (
            <span className="text-xs text-muted-foreground">{shot.lens}</span>
          )}
        </div>

        {/* Notes preview */}
        {shot.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
            {shot.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
