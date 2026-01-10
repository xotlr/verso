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

interface CreateTeamInput {
  name: string;
  description?: string;
  logo?: string;
}

interface TeamContextType {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  refreshTeams: () => Promise<void>;
  createTeam: (input: CreateTeamInput) => Promise<Team | null>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (input: CreateTeamInput): Promise<Team | null> => {
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  return (
    <TeamContext.Provider
      value={{
        teams,
        isLoading,
        error,
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
