"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMounted } from "@/hooks/use-mobile";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { EditorHeader } from "@/components/editor/editor-header";
import { BottomNav } from "@/components/bottom-nav";
import { EditorBottomNav } from "@/components/editor/editor-bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { cn } from "@/lib/utils";
import { ProductivityProvider } from "@/contexts/productivity-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const mounted = useMounted();
  const [focusMode, setFocusMode] = useState(false);

  // Check if we're on a screenplay editor page (but not timelapse)
  const isEditorPage = pathname.startsWith("/screenplay/") && !pathname.includes("/timelapse");

  // Ref for keyboard accessibility
  const focusContainerRef = useRef<HTMLDivElement>(null);

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  
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
      <SidebarProvider defaultOpen={false}>
        {/* Sidebar - slides out in focus mode */}
        <div className={cn(
          "transition-all duration-500 ease-out",
          focusMode && "opacity-0 -translate-x-full pointer-events-none"
        )}>
          <AppSidebar />
        </div>

        <SidebarInset className={cn(
          "flex flex-col h-screen transition-all duration-500 ease-out overflow-x-hidden",
          focusMode && "!ml-0"
        )}>
          {/* Header - slides up in focus mode */}
          <div className={cn(
            "transition-all duration-500 ease-out overflow-hidden",
            focusMode ? "opacity-0 -translate-y-full h-0" : "h-11"
          )}>
            {isEditorPage ? (
              <>
                {/* Mobile: EditorHeader with back, title, share */}
                <div className="md:hidden h-full">
                  <EditorHeader />
                </div>
                {/* Desktop: AppHeader (unified, Google Docs/Arc style) */}
                <div className="hidden md:block h-full">
                  <AppHeader />
                </div>
              </>
            ) : (
              <AppHeader />
            )}
          </div>

          <main
            ref={focusContainerRef}
            className={cn(
              "flex-1 overflow-hidden transition-all duration-300 ease-out",
              !focusMode && "pb-14 md:pb-0"
            )}
          >
            {children}
          </main>

          {/* Screen reader announcement for focus mode */}
          {focusMode && (
            <div className="sr-only" role="status" aria-live="polite">
              Focus mode activated. Press Escape to exit.
            </div>
          )}

          {/* Bottom Navigation - mobile only, hidden in focus mode */}
          {/* Editor pages get EditorBottomNav, other pages get BottomNav */}
          {(!mounted || !focusMode) && (
            isEditorPage ? <EditorBottomNav /> : <BottomNav />
          )}
        </SidebarInset>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </SidebarProvider>
    </ProductivityProvider>
  );
}
