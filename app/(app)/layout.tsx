"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductivityProvider } from "@/contexts/productivity-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [focusMode, setFocusMode] = useState(false);
  const [backdropActive, setBackdropActive] = useState(false);
  const isEditorRoute = pathname.includes('/screenplay/');

  // Refs for accessibility and scroll preservation
  const focusContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Listen for focus mode toggle events with staggered backdrop timing
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setFocusMode(prev => {
        const newMode = !prev;
        if (newMode) {
          // Save scroll position before entering focus mode
          const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
          scrollPositionRef.current = scrollContainer?.scrollTop || 0;
          setBackdropActive(true);
        } else {
          // Restore scroll position after exiting
          setTimeout(() => {
            const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollPositionRef.current;
            }
            setBackdropActive(false);
          }, 150); // Increased delay for smoother exit
        }
        return newMode;
      });
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  // Body scroll lock when focus mode is active
  useEffect(() => {
    if (focusMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [focusMode]);

  // Focus trap for keyboard accessibility
  useEffect(() => {
    if (!focusMode) return;

    const container = focusContainerRef.current;
    if (!container) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [focusMode]);

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

          {/* Focus mode exit button - centered at top */}
          <div className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out",
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

          <main
            ref={focusContainerRef}
            className={cn(
              "flex-1 overflow-hidden transition-all duration-400 ease-out",
              focusMode
                ? "fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8"
                : "pb-16 md:pb-0"
            )}
            role={focusMode ? "dialog" : undefined}
            aria-modal={focusMode ? "true" : undefined}
            aria-label={focusMode ? "Focus mode editor" : undefined}
          >
            <ScrollArea className="h-full w-full">
              <div className={cn(
                "w-full min-h-full transition-all duration-400",
                focusMode && "max-w-5xl max-h-[90vh] rounded-lg md:rounded-xl"
              )}>
                {children}
              </div>
            </ScrollArea>
          </main>

          {/* Screen reader announcement for focus mode */}
          {focusMode && (
            <div className="sr-only" role="status" aria-live="polite">
              Focus mode activated. Press Escape to exit.
            </div>
          )}

          {/* Bottom Navigation - mobile only, hidden in focus mode */}
          {!focusMode && <BottomNav />}
        </SidebarInset>

        {/* Focus mode backdrop overlay */}
        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/75 backdrop-blur-[8px] transition-opacity duration-400 ease-out",
            backdropActive ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-hidden="true"
        />

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </SidebarProvider>
    </ProductivityProvider>
  );
}
