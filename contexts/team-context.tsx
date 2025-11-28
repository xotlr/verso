"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Team {
  id: string;
  name: string;
  ownerId: string;
  logo: string | null;
  description: string | null;
  maxSeats: number;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  _count: {
    projects: number;
    members: number;
    invites: number;
  };
}

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  setCurrentTeam: (team: Team | null) => void;
  refreshTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/teams");
      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }
      const data = await response.json();
      setTeams(data);

      // Restore last selected team from localStorage
      const savedTeamId = localStorage.getItem("currentTeamId");
      if (savedTeamId && data.length > 0) {
        const savedTeam = data.find((t: Team) => t.id === savedTeamId);
        if (savedTeam) {
          setCurrentTeam(savedTeam);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (name: string): Promise<Team | null> => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create team");
      }

      const newTeam = await response.json();
      setTeams((prev) => [...prev, newTeam]);
      return newTeam;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
      return null;
    }
  }, []);

  const handleSetCurrentTeam = useCallback((team: Team | null) => {
    setCurrentTeam(team);
    if (team) {
      localStorage.setItem("currentTeamId", team.id);
    } else {
      localStorage.removeItem("currentTeamId");
    }
  }, []);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        isLoading,
        error,
        setCurrentTeam: handleSetCurrentTeam,
        refreshTeams,
        createTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
