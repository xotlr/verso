'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'verso-pwa-install-dismissed'
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * PWA Install Prompt Banner
 *
 * Shows a subtle banner when the app is installable.
 * - Listens to `beforeinstallprompt` event
 * - Remembers dismissal in localStorage
 * - Only shows on mobile/tablet
 */
export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < DISMISSED_DURATION) {
        return // Still within dismissal period
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Delay showing the prompt for better UX
      setTimeout(() => setIsVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsVisible(false)
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setIsVisible(false)
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
  }

  // Don't render if already installed or no prompt available
  if (isInstalled || !isVisible || !installPrompt) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'transform transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="bg-card border-t border-border shadow-lg p-4 safe-area-pb">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">
              Add VERSO to Home Screen
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Install for offline editing and faster access
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Install
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact install button for desktop sidebar/header
 */
export function InstallButton({ className }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
  }

  // Don't render if already installed or no prompt available
  if (isInstalled || !installPrompt) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  )
}
