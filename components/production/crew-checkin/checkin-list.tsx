"use client"

import { useState, useCallback } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CrewMember {
  name: string
  department: string
  role?: string
}

interface CheckIn {
  id: string
  crewName: string
  department: string
  checkedInAt: string
  notes?: string | null
}

interface CheckinListProps {
  callsheetId: string
  crewMembers: CrewMember[]
  checkIns: CheckIn[]
  onCheckInsChange?: (checkIns: CheckIn[]) => void
}

export function CheckinList({
  callsheetId,
  crewMembers,
  checkIns,
  onCheckInsChange,
}: CheckinListProps) {
  const [loading, setLoading] = useState<Set<string>>(new Set())

  const isCheckedIn = useCallback(
    (name: string) => checkIns.some((c) => c.crewName === name),
    [checkIns]
  )

  const toggleCheckIn = useCallback(
    async (member: CrewMember) => {
      const alreadyCheckedIn = isCheckedIn(member.name)
      setLoading((prev) => new Set(prev).add(member.name))

      try {
        if (alreadyCheckedIn) {
          // Remove check-in
          const response = await fetch(
            `/api/callsheets/${callsheetId}/checkin?crewName=${encodeURIComponent(member.name)}`,
            { method: "DELETE" }
          )
          if (!response.ok) throw new Error("Failed to remove check-in")

          onCheckInsChange?.(checkIns.filter((c) => c.crewName !== member.name))
        } else {
          // Add check-in
          const response = await fetch(`/api/callsheets/${callsheetId}/checkin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              crewName: member.name,
              department: member.department,
            }),
          })
          if (!response.ok) throw new Error("Failed to check in")

          const { checkIn } = await response.json()
          onCheckInsChange?.([...checkIns, checkIn])
        }
      } catch (error) {
        console.error("Check-in error:", error)
        toast.error(
          alreadyCheckedIn ? "Failed to remove check-in" : "Failed to check in"
        )
      } finally {
        setLoading((prev) => {
          const next = new Set(prev)
          next.delete(member.name)
          return next
        })
      }
    },
    [callsheetId, checkIns, isCheckedIn, onCheckInsChange]
  )

  // Group by department
  const byDepartment = crewMembers.reduce(
    (acc, member) => {
      if (!acc[member.department]) {
        acc[member.department] = []
      }
      acc[member.department].push(member)
      return acc
    },
    {} as Record<string, CrewMember[]>
  )

  return (
    <div className="space-y-4">
      {Object.entries(byDepartment).map(([department, members]) => (
        <div key={department} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {department}
          </h4>
          <div className="space-y-1">
            {members.map((member) => {
              const checked = isCheckedIn(member.name)
              const isLoading = loading.has(member.name)

              return (
                <Button
                  key={member.name}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto py-2 px-3",
                    "hover:bg-muted/50",
                    checked && "bg-muted/30"
                  )}
                  onClick={() => toggleCheckIn(member)}
                  disabled={isLoading}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full mr-3 flex-shrink-0",
                      "border transition-colors",
                      checked
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : checked ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </div>
                  <div className="flex-1 text-left">
                    <span
                      className={cn(
                        "text-sm",
                        checked && "text-muted-foreground"
                      )}
                    >
                      {member.name}
                    </span>
                    {member.role && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {member.role}
                      </span>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
