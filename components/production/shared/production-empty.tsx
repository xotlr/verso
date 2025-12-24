"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Film, Plus } from "lucide-react"

interface ProductionEmptyProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function ProductionEmpty({
  title,
  description,
  actionLabel,
  onAction,
}: ProductionEmptyProps) {
  return (
    <Card className="border-border/50 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-3 rounded-full bg-muted">
          <Film className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
