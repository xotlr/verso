"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Target, Timer, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserStats {
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  todayWordCount: number;
  todayDuration: number;
  goalProgress: number;
}

interface ProductivityWidgetProps {
  onTimerStart?: () => void;
  isTimerActive?: boolean;
  timerMinutes?: number;
}

export function ProductivityWidget({
  onTimerStart,
  isTimerActive = false,
  timerMinutes = 0,
}: ProductivityWidgetProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    fetchStats();
    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setGoalInput(data.dailyGoal.toString());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGoal = async () => {
    const newGoal = parseInt(goalInput);
    if (isNaN(newGoal) || newGoal < 100 || newGoal > 10000) return;

    try {
      const response = await fetch("/api/stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyGoal: newGoal }),
      });

      if (response.ok) {
        fetchStats();
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Loading stats...
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="px-3 py-2 space-y-3">
      {/* Daily Goal Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-3 w-3" />
            Daily Goal
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <Settings2 className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-xs">
                  Daily word goal
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="goal"
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="h-8"
                    min={100}
                    max={10000}
                  />
                  <Button size="sm" className="h-8" onClick={updateGoal}>
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Progress value={stats.goalProgress} className="h-1.5" />
        <div className="flex justify-between text-xs">
          <span className="text-foreground font-medium">
            {stats.todayWordCount.toLocaleString()}
          </span>
          <span className="text-muted-foreground">
            / {stats.dailyGoal.toLocaleString()} words
          </span>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flame
            className={cn(
              "h-3 w-3",
              stats.currentStreak > 0 && "text-orange-500"
            )}
          />
          Streak
        </span>
        <span className="text-xs font-medium text-foreground">
          {stats.currentStreak} day{stats.currentStreak !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timer
            className={cn("h-3 w-3", isTimerActive && "text-green-500")}
          />
          {isTimerActive ? "Writing" : "Today"}
        </span>
        <span className="text-xs font-medium text-foreground">
          {isTimerActive
            ? formatDuration(timerMinutes)
            : formatDuration(stats.todayDuration)}
        </span>
      </div>

      {/* Timer Button */}
      {onTimerStart && (
        <Button
          variant={isTimerActive ? "secondary" : "outline"}
          size="sm"
          className="w-full h-7 text-xs"
          onClick={onTimerStart}
        >
          <Timer className="h-3 w-3 mr-1.5" />
          {isTimerActive ? "Stop Timer" : "Start Timer"}
        </Button>
      )}
    </div>
  );
}
