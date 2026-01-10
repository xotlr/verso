import { NextResponse } from "next/server"
import { createApiHandler, UnauthorizedError } from "@/lib/api"
import { runAllChecks, saveHealthChecks } from "@/lib/health"
import { prisma } from "@/lib/prisma"

async function updateDailyUptime() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const services = ["api", "database", "auth", "wasm"]

  for (const service of services) {
    const checks = await prisma.serviceHealthCheck.findMany({
      where: { service, checkedAt: { gte: today } },
    })

    if (checks.length === 0) continue

    const operationalChecks = checks.filter((c) => c.status === "operational").length
    const uptimePercent = (operationalChecks / checks.length) * 100
    const outageChecks = checks.filter((c) => c.status === "outage").length
    const downtimeMinutes = outageChecks * 5

    await prisma.uptimeRecord.upsert({
      where: { service_date: { service, date: today } },
      create: { service, date: today, uptimePercent, downtimeMinutes },
      update: { uptimePercent, downtimeMinutes },
    })
  }
}

export const GET = createApiHandler({
  auth: "none",
  handler: async ({ request }) => {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
        throw new UnauthorizedError()
      }
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
