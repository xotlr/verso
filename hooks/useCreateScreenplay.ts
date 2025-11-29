"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScreenplayFormData,
  ScreenplayTypeId,
  screenplayTypes,
  templateContent,
  Template,
} from "@/types/templates";

interface CreateScreenplayParams {
  formData: ScreenplayFormData;
  projectId?: string;
}

export function useCreateScreenplay() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createScreenplay = async ({ formData, projectId }: CreateScreenplayParams) => {
    setIsCreating(true);
    try {
      const typeConfig = screenplayTypes[formData.type];
      const content = templateContent[formData.type];

      // Determine the title based on type
      let title = formData.title;
      if (formData.type === 'tv-series' && formData.seriesTitle) {
        // For TV, format as "Series Title - S01E01 - Episode Title"
        const seasonNum = String(formData.season || 1).padStart(2, '0');
        const episodeNum = String(formData.episode || 1).padStart(2, '0');
        title = `${formData.seriesTitle} - S${seasonNum}E${episodeNum}`;
        if (formData.episodeTitle) {
          title += ` - ${formData.episodeTitle}`;
        }
      }

      const response = await fetch("/api/screenplays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          projectId,
          // New fields for database
          type: typeConfig.dbType,
          season: formData.type === 'tv-series' ? formData.season : null,
          episode: formData.type === 'tv-series' ? formData.episode : null,
          episodeTitle: formData.type === 'tv-series' ? formData.episodeTitle : null,
          logline: formData.logline || null,
          genre: formData.genre || null,
        }),
      });

      if (response.ok) {
        const screenplay = await response.json();
        router.push(`/screenplay/${screenplay.id}`);
        return screenplay;
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create screenplay");
      }
    } catch (error) {
      console.error("Error creating screenplay:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  // Legacy support for old template-based creation
  const createFromTemplate = async (template: Template, projectId?: string) => {
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
        router.push(`/screenplay/${screenplay.id}`);
        return screenplay;
      }
    } catch (error) {
      console.error("Error creating screenplay:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return { createScreenplay, createFromTemplate, isCreating };
}
