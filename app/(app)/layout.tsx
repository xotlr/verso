"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [focusMode, setFocusMode] = useState(false);

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  // Exit focus mode with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  return (
    <>
      {/* Focus mode overlay with rounded container */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-foreground transition-all duration-500",
          focusMode ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="h-full flex items-center justify-center p-6">
          <div
            className={cn(
              "relative w-full max-w-6xl h-[calc(100vh-3rem)] bg-background rounded-2xl shadow-2xl overflow-hidden transition-all duration-500",
              focusMode ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
          >
            {/* Exit button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => setFocusMode(false)}
              title="Exit Focus Mode (Esc)"
            >
              <Minimize2 className="h-5 w-5" />
            </Button>
            {/* Content */}
            <main className="h-full overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Normal layout */}
      <div className={cn(
        "transition-all duration-300",
        focusMode && "opacity-0 pointer-events-none"
      )}>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
