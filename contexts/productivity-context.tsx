"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface ProductivityContextType {
  // Timer state
  isTimerActive: boolean;
  timerMinutes: number;
  startTimer: () => void;
  stopTimer: () => void;
  toggleTimer: () => void;

  // Word tracking
  sessionWordCount: number;
  updateWordCount: (count: number) => void;

  // Session management
  saveSession: () => Promise<void>;
}

const ProductivityContext = createContext<ProductivityContextType | undefined>(
  undefined
);

export function ProductivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const [sessionStartWordCount, setSessionStartWordCount] = useState(0);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Timer logic
  const startTimer = useCallback(() => {
    if (isTimerActive) return;

    setIsTimerActive(true);
    sessionStartTimeRef.current = new Date();
    setSessionStartWordCount(sessionWordCount);

    timerIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const elapsed = Math.floor(
          (Date.now() - sessionStartTimeRef.current.getTime()) / 60000
        );
        setTimerMinutes(elapsed);
      }
    }, 1000);
  }, [isTimerActive, sessionWordCount]);

  const stopTimer = useCallback(async () => {
    if (!isTimerActive) return;

    setIsTimerActive(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Calculate session stats
    const duration = timerMinutes;
    const wordsWritten = Math.max(0, sessionWordCount - sessionStartWordCount);

    // Only save if there was meaningful activity
    if (duration >= 1 || wordsWritten > 0) {
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordCount: wordsWritten,
            duration,
          }),
        });
      } catch (error) {
        console.error("Error saving session:", error);
      }
    }

    // Reset timer state
    setTimerMinutes(0);
    sessionStartTimeRef.current = null;
  }, [isTimerActive, timerMinutes, sessionWordCount, sessionStartWordCount]);

  const toggleTimer = useCallback(() => {
    if (isTimerActive) {
      stopTimer();
    } else {
      startTimer();
    }
  }, [isTimerActive, startTimer, stopTimer]);

  // Word count tracking
  const updateWordCount = useCallback((count: number) => {
    setSessionWordCount(count);
  }, []);

  // Manual session save
  const saveSession = useCallback(async () => {
    if (!isTimerActive) return;
    await stopTimer();
  }, [isTimerActive, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Save session before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTimerActive && timerMinutes > 0) {
        // Sync save before unload
        const wordsWritten = Math.max(0, sessionWordCount - sessionStartWordCount);
        navigator.sendBeacon(
          "/api/sessions",
          JSON.stringify({
            wordCount: wordsWritten,
            duration: timerMinutes,
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTimerActive, timerMinutes, sessionWordCount, sessionStartWordCount]);

  return (
    <ProductivityContext.Provider
      value={{
        isTimerActive,
        timerMinutes,
        startTimer,
        stopTimer,
        toggleTimer,
        sessionWordCount,
        updateWordCount,
        saveSession,
      }}
    >
      {children}
    </ProductivityContext.Provider>
  );
}

export function useProductivity() {
  const context = useContext(ProductivityContext);
  if (context === undefined) {
    throw new Error(
      "useProductivity must be used within a ProductivityProvider"
    );
  }
  return context;
}
