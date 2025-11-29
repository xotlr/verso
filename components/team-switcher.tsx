"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTeam } from "@/contexts/team-context";
import { ChevronsUpDown, Plus, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TeamSwitcherProps {
  isCollapsed?: boolean;
}

export function TeamSwitcher({ isCollapsed = false }: TeamSwitcherProps) {
  const { data: session } = useSession();
  const { teams, currentTeam, setCurrentTeam, createTeam, isLoading } = useTeam();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    const team = await createTeam({
      name: newTeamName.trim(),
      description: newTeamDescription.trim() || undefined,
      logo: newTeamLogo || undefined,
    });
    if (team) {
      setCurrentTeam(team);
      setShowCreateDialog(false);
      resetForm();
    }
    setIsCreating(false);
  };

  const resetForm = () => {
    setNewTeamName("");
    setNewTeamDescription("");
    setNewTeamLogo(undefined);
    setShowOptionalFields(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">V</span>
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
              {currentTeam ? (
                <Users className="h-4 w-4 text-primary-foreground" />
              ) : (
                <span className="text-sm font-bold text-primary-foreground">V</span>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-col leading-none min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate">
                    {currentTeam ? currentTeam.name : "Verso"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentTeam ? `${currentTeam._count?.projects ?? 0} projects` : "Personal"}
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
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <span className="text-xs font-bold text-primary">V</span>
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-sm font-medium">Personal</span>
              <span className="text-xs text-muted-foreground">Your private projects</span>
            </div>
            {!currentTeam && <Check className="h-4 w-4 text-primary" />}
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.members.length} members
                    </span>
                  </div>
                  {currentTeam?.id === team.id && <Check className="h-4 w-4 text-primary" />}
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
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
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
                  if (e.key === "Enter" && !showOptionalFields) {
                    handleCreateTeam();
                  }
                }}
              />
            </div>

            {/* Optional fields collapsible */}
            <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span>Optional settings</span>
                  {showOptionalFields ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid gap-2">
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    placeholder="What's your team working on?"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {session?.user?.id && (
                  <div className="grid gap-2">
                    <Label>Team Logo</Label>
                    <p className="text-xs text-muted-foreground">Square image works best</p>
                    <ImageUpload
                      value={newTeamLogo}
                      onChange={setNewTeamLogo}
                      bucket="team-assets"
                      userId={session.user.id}
                      aspectRatio="square"
                      className="w-24"
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
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
