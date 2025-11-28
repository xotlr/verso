"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Template } from "@/types/templates";

export function useCreateScreenplay() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createScreenplay = async (template: Template, projectId?: string) => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/screenplays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:
            template.name === "Blank Screenplay"
              ? "Untitled Screenplay"
              : template.name,
          content: template.content,
          projectId,
        }),
      });

      if (response.ok) {
        const screenplay = await response.json();
        router.push(`/editor/${screenplay.id}`);
        return screenplay;
      }
    } catch (error) {
      console.error("Error creating screenplay:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return { createScreenplay, isCreating };
}
