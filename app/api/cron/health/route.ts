import { createApiHandler, UnauthorizedError } from "@/lib/api"
import { runAllChecks, saveHealthChecks } from "@/lib/health"
import { createServerActionClient } from "@/lib/supabase/server"
import { timingSafeEqual } from "crypto"

/**
 * Constant-time comparison for secret tokens.
 * Prevents timing attacks by always comparing in the same time regardless of match.
 */
function secureTokenCompare(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  // Ensure same length comparison to prevent length-based timing attacks
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) {
    // Compare against expected anyway to maintain constant time
    timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

async function updateDailyUptime() {
  const supabase = await createServerActionClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const services = ["api", "database", "auth", "wasm"]

  for (const service of services) {
    const { data: checks } = await supabase
      .from("ServiceHealthCheck")
      .select("status")
      .eq("service", service)
      .gte("checkedAt", today.toISOString())

    if (!checks || checks.length === 0) continue

    const operationalChecks = checks.filter((c: { status: string }) => c.status === "operational").length
    const uptimePercent = (operationalChecks / checks.length) * 100
    const outageChecks = checks.filter((c: { status: string }) => c.status === "outage").length
    const downtimeMinutes = outageChecks * 5

    // Try to update, if no rows affected then insert
    const { data: existing } = await supabase
      .from("UptimeRecord")
      .select("id")
      .eq("service", service)
      .eq("date", today.toISOString().split("T")[0])
      .single() as { data: { id: string } | null }

    if (existing) {
      await (supabase
        .from("UptimeRecord") as ReturnType<typeof supabase.from>)
        .update({ uptimePercent, downtimeMinutes } as Record<string, unknown>)
        .eq("id", existing.id)
    } else {
      await (supabase
        .from("UptimeRecord") as ReturnType<typeof supabase.from>)
        .insert({ service, date: today.toISOString().split("T")[0], uptimePercent, downtimeMinutes } as Record<string, unknown>)
    }
  }
}

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ request }) => {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // Always validate token in production, or when CRON_SECRET is configured
    if (cronSecret) {
      const providedToken = authHeader?.replace("Bearer ", "") || ""
      if (!secureTokenCompare(providedToken, cronSecret)) {
        throw new UnauthorizedError()
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production without CRON_SECRET configured, reject all requests
      throw new UnauthorizedError()
    }

    const health = await runAllChecks()
    await saveHealthChecks(health.services)
    await updateDailyUptime()

    return {
      success: true,
      timestamp: health.timestamp,
      status: health.status,
      services: health.services.map((s) => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime,
      })),
    }
  },
})

export const dynamic = "force-dynamic"
export const maxDuration = 30
