"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductivityProvider } from "@/contexts/productivity-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [focusMode, setFocusMode] = useState(false);
  const isEditorRoute = pathname.includes('/screenplay/');

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
        window.dispatchEvent(new CustomEvent('focus-mode-toggle'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  return (
    <ProductivityProvider>
      <SidebarProvider defaultOpen={!focusMode && !isEditorRoute}>
        {/* Sidebar - slides out in focus mode */}
        <div className={cn(
          "transition-all duration-500 ease-out",
          focusMode && "opacity-0 -translate-x-full pointer-events-none"
        )}>
          <AppSidebar />
        </div>

        <SidebarInset className={cn(
          "flex flex-col h-screen transition-all duration-500 ease-out",
          focusMode && "!ml-0"
        )}>
          {/* Header - always shown on desktop, hidden in focus mode */}
          {!focusMode && <AppHeader />}

          {/* Focus mode exit button - appears with fade */}
          <div className={cn(
            "fixed top-4 right-4 z-50 transition-all duration-300 ease-out",
            focusMode ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          )}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 opacity-70 hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm shadow-lg"
              onClick={() => window.dispatchEvent(new CustomEvent('focus-mode-toggle'))}
              title="Exit Focus Mode (Esc)"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="text-xs">Exit Focus</span>
            </Button>
          </div>

          <main className={cn(
            "flex-1 overflow-auto transition-all duration-300",
            focusMode && "p-4",
            // Add bottom padding on mobile for bottom nav (except in focus mode)
            !focusMode && "pb-16 md:pb-0"
          )}>
            {children}
          </main>

          {/* Bottom Navigation - mobile only, hidden in focus mode */}
          {!focusMode && <BottomNav />}
        </SidebarInset>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </SidebarProvider>
    </ProductivityProvider>
  );
}
