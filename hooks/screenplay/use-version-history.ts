import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

interface UseVersionHistoryOptions {
  screenplayId: string;
  /** Function to get current content - uses ref pattern to avoid re-renders */
  getContent: () => string;
  /** Interval in ms for auto-versioning (default: 30 minutes) */
  intervalMs?: number;
}

interface UseVersionHistoryReturn {
  /** Create a version snapshot */
  createVersion: (
    content: string,
    reason: "manual" | "auto" | "interval" | "restore",
    message?: string
  ) => Promise<void>;
  /** Trigger save version dialog (for manual saves with message) */
  saveVersionWithMessage: (message?: string) => Promise<void>;
}

export function useVersionHistory({
  screenplayId,
  getContent,
  intervalMs = 30 * 60 * 1000, // 30 minutes default
}: UseVersionHistoryOptions): UseVersionHistoryReturn {
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");

  // Create a version snapshot
  const createVersion = useCallback(
    async (
      content: string,
      reason: "manual" | "auto" | "interval" | "restore",
      message?: string
    ) => {
      // Skip if content hasn't changed since last version
      if (content === lastVersionContentRef.current && reason !== "manual") {
        return;
      }

      try {
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const sceneCount = (content.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length;

        const response = await fetch(`/api/screenplays/${screenplayId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            reason,
            wordCount,
            sceneCount,
            message: message || undefined,
          }),
        });

        if (response.ok) {
          lastVersionContentRef.current = content;
          if (reason === "manual") {
            toast.success("Version saved");
          }
        }
      } catch (error) {
        console.error("Error creating version:", error);
      }
    },
    [screenplayId]
  );

  // Handle save with message
  const saveVersionWithMessage = useCallback(
    async (message?: string) => {
      const currentContent = getContent();
      await createVersion(currentContent, "manual", message);
    },
    [createVersion, getContent]
  );

  // Interval-based versioning
  useEffect(() => {
    versionIntervalRef.current = setInterval(() => {
      const currentText = getContent();
      if (currentText && currentText !== lastVersionContentRef.current) {
        createVersion(currentText, "interval");
      }
    }, intervalMs);

    return () => {
      if (versionIntervalRef.current) {
        clearInterval(versionIntervalRef.current);
      }
    };
  }, [createVersion, getContent, intervalMs]);

  return {
    createVersion,
    saveVersionWithMessage,
  };
}
