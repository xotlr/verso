"use client";

import { useState } from "react";
import { useTeam } from "@/contexts/team-context";
import { ChevronsUpDown, Plus, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamSwitcherProps {
  isCollapsed?: boolean;
}

export function TeamSwitcher({ isCollapsed = false }: TeamSwitcherProps) {
  const { teams, currentTeam, setCurrentTeam, createTeam, isLoading } = useTeam();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    const team = await createTeam(newTeamName.trim());
    if (team) {
      setCurrentTeam(team);
      setShowCreateDialog(false);
      setNewTeamName("");
    }
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-semibold">V</span>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5">
            <div className="h-4 w-20 animate-pulse bg-muted rounded" />
            <div className="h-3 w-12 animate-pulse bg-muted rounded" />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
              isCollapsed && "justify-center px-0"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
              {currentTeam ? (
                <Users className="h-4 w-4" />
              ) : (
                <span className="text-sm font-semibold">V</span>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate">
                    {currentTeam ? currentTeam.name : "Verso"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentTeam ? `${currentTeam._count.projects} projects` : "Personal"}
                  </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[240px]"
          align="start"
          side="bottom"
          sideOffset={8}
        >
          <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Personal workspace */}
          <DropdownMenuItem
            onClick={() => setCurrentTeam(null)}
            className="flex items-center gap-3 py-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <span className="text-xs font-semibold">V</span>
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-sm font-medium">Personal</span>
              <span className="text-xs text-muted-foreground">Your private projects</span>
            </div>
            {!currentTeam && <Check className="h-4 w-4" />}
          </DropdownMenuItem>

          {/* Team workspaces */}
          {teams.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => setCurrentTeam(team)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.members.length} members
                    </span>
                  </div>
                  {currentTeam?.id === team.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate on screenplays with others.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                placeholder="My Awesome Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateTeam();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={isCreating || !newTeamName.trim()}>
              {isCreating ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
