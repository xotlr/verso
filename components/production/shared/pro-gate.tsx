"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { canUseProduction, type PlanType } from "@/lib/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Crown } from "lucide-react"
import { UpgradeDialog } from "@/components/upgrade-dialog"

interface ProGateProps {
  children: React.ReactNode
  feature?: string
  fallback?: React.ReactNode
}

export function ProGate({ children, feature, fallback }: ProGateProps) {
  const { data: session } = useSession()
  const plan = (session?.user?.plan as PlanType) || "FREE"

  if (canUseProduction(plan)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <ProUpgradePrompt feature={feature} />
}

interface ProUpgradePromptProps {
  feature?: string
}

export function ProUpgradePrompt({ feature }: ProUpgradePromptProps) {
  const [showUpgrade, setShowUpgrade] = useState(false)

  return (
    <>
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 p-3 rounded-full bg-muted">
            <Crown className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {feature ? `${feature} requires Pro` : "Pro Feature"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Upgrade to Pro to unlock production features including shot tracking,
            digital sides, wrap reports, and more.
          </p>
          <Button onClick={() => setShowUpgrade(true)} className="gap-2">
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  )
}
