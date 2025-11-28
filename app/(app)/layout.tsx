"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductivityProvider } from "@/contexts/productivity-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Routes that have their own header (ProjectHeader)
const projectRoutes = ['/editor/', '/board/', '/cards/', '/visualization/'];

function isProjectRoute(pathname: string): boolean {
  return projectRoutes.some(route => pathname.startsWith(route));
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [focusMode, setFocusMode] = useState(false);
  const showAppHeader = !isProjectRoute(pathname);
  const isEditorRoute = pathname.includes('/editor/');

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
    <ProductivityProvider>
      <SidebarProvider defaultOpen={!focusMode && !isEditorRoute}>
        {/* Sidebar - hidden in focus mode */}
        <div className={cn(
          "transition-all duration-300",
          focusMode && "hidden"
        )}>
          <AppSidebar />
        </div>

        <SidebarInset className={cn(
          "flex flex-col h-screen transition-all duration-300",
          focusMode && "!ml-0"
        )}>
          {/* Header - hidden in focus mode */}
          {showAppHeader && !focusMode && <AppHeader />}

          {/* Focus mode exit button */}
          {focusMode && (
            <div className="fixed top-4 right-4 z-50">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 opacity-60 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={() => setFocusMode(false)}
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 className="h-4 w-4" />
                <span className="text-xs">Exit Focus</span>
              </Button>
            </div>
          )}

          <main className={cn(
            "flex-1 overflow-hidden transition-all duration-300",
            focusMode && "p-4"
          )}>
            {children}
          </main>
        </SidebarInset>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </SidebarProvider>
    </ProductivityProvider>
  );
}
