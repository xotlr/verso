"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMounted } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { EditorHeader } from "@/components/editor/editor-header";
import { BottomNav } from "@/components/bottom-nav";
import { EditorBottomNav } from "@/components/editor/editor-bottom-nav";
import { EditorPanelProvider } from "@/components/editor/EditorPanelContext";
import { EditorSceneProvider } from "@/contexts/editor-scene-context";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { cn } from "@/lib/utils";
import { ProductivityProvider } from "@/contexts/productivity-context";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();
  const mounted = useMounted();
  const [focusMode, setFocusMode] = useState(false);

  // Check if we're on a screenplay editor page (but not timelapse)
  const isEditorPage = pathname.startsWith("/screenplay/") && !pathname.includes("/timelapse");

  // Show success toast after Stripe checkout and refresh session
  useEffect(() => {
    const success = searchParams.get("success");
    const plan = searchParams.get("plan");

    if (success === "true" && plan) {
      // Give webhook a moment to process, then refresh session
      const refreshSession = async () => {
        // Small delay to allow Stripe webhook to update the database
        await new Promise(resolve => setTimeout(resolve, 1500));
        await updateSession();
      };
      refreshSession();

      toast.success(`Welcome to ${plan.charAt(0) + plan.slice(1).toLowerCase()}!`, {
        description: "Your subscription is now active.",
        duration: 5000,
      });

      // Clean up URL params without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, updateSession]);

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
      <EditorSceneProvider>
        <SidebarProvider>
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

          {isEditorPage ? (
            <EditorPanelProvider>
              <main
                ref={focusContainerRef}
                className={cn(
                  "flex-1 overflow-hidden transition-all duration-300 ease-out",
                  !focusMode && "pb-14 md:pb-0"
                )}
              >
                {children}
              </main>

              {/* Bottom Navigation - mobile only, hidden in focus mode */}
              {(!mounted || !focusMode) && <EditorBottomNav />}
            </EditorPanelProvider>
          ) : (
            <>
              <main
                ref={focusContainerRef}
                className={cn(
                  "flex-1 overflow-hidden transition-all duration-300 ease-out",
                  !focusMode && "pb-14 md:pb-0"
                )}
              >
                {children}
              </main>

              {/* Bottom Navigation - mobile only, hidden in focus mode */}
              {(!mounted || !focusMode) && <BottomNav />}
            </>
          )}

          {/* Screen reader announcement for focus mode */}
          {focusMode && (
            <div className="sr-only" role="status" aria-live="polite">
              Focus mode activated. Press Escape to exit.
            </div>
          )}
        </SidebarInset>

        {/* PWA Install Prompt */}
        <InstallPrompt />
        </SidebarProvider>
      </EditorSceneProvider>
    </ProductivityProvider>
  );
}
