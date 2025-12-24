"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface QuickCheckinButtonProps {
  callsheetId: string
  crewName: string
  department: string
  isCheckedIn: boolean
  onCheckedIn?: () => void
  className?: string
}

export function QuickCheckinButton({
  callsheetId,
  crewName,
  department,
  isCheckedIn,
  onCheckedIn,
  className,
}: QuickCheckinButtonProps) {
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(isCheckedIn)

  const handleCheckIn = async () => {
    if (checked) return // Already checked in

    setLoading(true)
    try {
      const response = await fetch(`/api/callsheets/${callsheetId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewName, department }),
      })

      if (!response.ok) throw new Error("Failed to check in")

      setChecked(true)
      onCheckedIn?.()
      toast.success("Checked in")
    } catch (error) {
      console.error("Check-in error:", error)
      toast.error("Failed to check in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={checked ? "secondary" : "default"}
      size="lg"
      className={cn("w-full h-14 text-base", className)}
      onClick={handleCheckIn}
      disabled={loading || checked}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : checked ? (
        <Check className="h-5 w-5 mr-2" />
      ) : null}
      {checked ? "Checked In" : "Check In"}
    </Button>
  )
}
