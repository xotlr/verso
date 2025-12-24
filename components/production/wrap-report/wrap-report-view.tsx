'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Film, Hash, Clock } from 'lucide-react';

interface TakeNote {
  takeNum: number;
  rating: string | null;
  notes: string | null;
  timecode: string | null;
}

interface ShotData {
  id: string;
  sceneId: string;
  shotNumber: number;
  description: string;
  shotType: string | null;
  status: string;
  takeCount: number;
  circledTake: number | null;
  quickNotes: string | null;
  supervisorNotes: string | null;
  continuityNotes: string | null;
  isFlagged: boolean;
  statusChangedAt: string | null;
  takeNotes: TakeNote[];
}

interface SceneData {
  sceneId: string;
  sceneName: string;
  shots: ShotData[];
  totalTakes: number;
  completedShots: number;
}

interface WrapReportData {
  screenplay: {
    id: string;
    title: string;
  };
  callsheet: {
    id: string;
    title: string;
    shootDate: string;
    callTime: string;
    wrapTime: string | null;
  } | null;
  date: string | null;
  generatedAt: string;
  summary: {
    totalShots: number;
    totalTakes: number;
    approvedShots: number;
    flaggedShots: number;
    shotsWithCircled: number;
    avgTakesPerShot: number;
    scenesWorked: number;
  };
  scenes: SceneData[];
}

interface WrapReportViewProps {
  data: WrapReportData;
  compact?: boolean;
}

export function WrapReportView({ data, compact = false }: WrapReportViewProps) {
  const { screenplay, callsheet, summary, scenes, generatedAt } = data;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold">{screenplay.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Wrap Report - {callsheet ? formatDate(callsheet.shootDate) : 'All Time'}
        </p>
        {callsheet && (
          <p className="text-xs text-muted-foreground mt-1">
            {callsheet.title} | Call: {formatTime(callsheet.callTime)}
            {callsheet.wrapTime && ` | Wrap: ${formatTime(callsheet.wrapTime)}`}
          </p>
        )}
      </div>

      {/* Summary Stats */}
      <div className={cn(
        'grid gap-4',
        compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
      )}>
        <StatCard
          label="Shots Completed"
          value={summary.totalShots}
          subValue={`${summary.approvedShots} approved`}
          icon={<Film className="h-4 w-4" />}
        />
        <StatCard
          label="Total Takes"
          value={summary.totalTakes}
          subValue={`${summary.avgTakesPerShot} avg/shot`}
          icon={<Hash className="h-4 w-4" />}
        />
        <StatCard
          label="Scenes Worked"
          value={summary.scenesWorked}
          icon={<Clock className="h-4 w-4" />}
        />
        {summary.flaggedShots > 0 && (
          <StatCard
            label="Flagged"
            value={summary.flaggedShots}
            subValue="needs review"
            icon={<AlertTriangle className="h-4 w-4" />}
            warning
          />
        )}
      </div>

      {/* Scene Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Scene Breakdown
        </h3>

        {scenes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No completed shots for this period.
          </div>
        ) : (
          <div className="space-y-3">
            {scenes.map((scene) => (
              <SceneSection key={scene.sceneId} scene={scene} compact={compact} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        Generated {new Date(generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon,
  warning,
}: {
  label: string;
  value: number;
  subValue?: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      warning && 'border-amber-500/50 bg-amber-500/5'
    )}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground">{subValue}</div>
      )}
    </div>
  );
}

function SceneSection({ scene, compact }: { scene: SceneData; compact?: boolean }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Scene Header */}
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium truncate flex-1">{scene.sceneName}</span>
        <span className="text-xs text-muted-foreground ml-2">
          {scene.completedShots} shots | {scene.totalTakes} takes
        </span>
      </div>

      {/* Shot List */}
      {!compact && (
        <div className="divide-y">
          {scene.shots.map((shot) => (
            <ShotRow key={shot.id} shot={shot} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShotRow({ shot }: { shot: ShotData }) {
  return (
    <div className={cn(
      'px-3 py-2 flex items-start gap-3',
      shot.isFlagged && 'bg-amber-500/5'
    )}>
      {/* Shot Number */}
      <div className="flex items-center gap-1 min-w-[60px]">
        <span className="text-sm font-mono">{shot.shotNumber}</span>
        {shot.shotType && (
          <span className="text-xs text-muted-foreground">{shot.shotType}</span>
        )}
      </div>

      {/* Description & Notes */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{shot.description}</p>
        {(shot.quickNotes || shot.supervisorNotes) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {shot.quickNotes || shot.supervisorNotes}
          </p>
        )}
      </div>

      {/* Takes & Status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {shot.takeCount} {shot.takeCount === 1 ? 'take' : 'takes'}
        </span>
        {shot.circledTake && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-foreground text-xs font-medium">
            {shot.circledTake}
          </span>
        )}
        {shot.status === 'approved' && (
          <Check className="h-4 w-4 text-foreground" />
        )}
        {shot.isFlagged && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>
    </div>
  );
}
