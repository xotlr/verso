import { Metadata } from "next"
import { Check, AlertTriangle, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "System Status | Verso",
  description: "Check the current status of Verso services and infrastructure.",
}

// In a real app, this would fetch from a status API
const services = [
  { name: "Web Application", status: "operational" },
  { name: "API", status: "operational" },
  { name: "Database", status: "operational" },
  { name: "Authentication", status: "operational" },
  { name: "File Storage", status: "operational" },
  { name: "Real-time Collaboration", status: "operational" },
  { name: "Export Services", status: "operational" },
  { name: "Email Notifications", status: "operational" },
]

const incidents: { date: string; title: string; status: string; description: string }[] = []

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "operational":
      return <Check className="h-5 w-5 text-green-500" />
    case "degraded":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case "outage":
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Check className="h-5 w-5 text-green-500" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    operational: "bg-green-500/10 text-green-600 border-green-500/20",
    degraded: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    outage: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  const labels = {
    operational: "Operational",
    degraded: "Degraded Performance",
    outage: "Service Outage",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[status as keyof typeof colors] || colors.operational}`}>
      {labels[status as keyof typeof labels] || "Operational"}
    </span>
  )
}

export default function StatusPage() {
  const allOperational = services.every(s => s.status === "operational")

  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            System Status
          </h1>
          <p className="text-muted-foreground">
            Current status of Verso services
          </p>
        </div>

        {/* Overall Status */}
        <div className={`p-6 rounded-xl border mb-8 ${allOperational ? "bg-green-500/5 border-green-500/20" : "bg-yellow-500/5 border-yellow-500/20"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allOperational ? (
                <Check className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <h2 className="text-xl font-medium">
                  {allOperational ? "All Systems Operational" : "Some Systems Affected"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <StatusBadge status={allOperational ? "operational" : "degraded"} />
          </div>
        </div>

        {/* Services List */}
        <div className="rounded-xl border overflow-hidden mb-12">
          <div className="bg-muted/30 px-6 py-3 border-b">
            <h3 className="font-medium">Services</h3>
          </div>
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between px-6 py-4">
                <span>{service.name}</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={service.status} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/30 px-6 py-3 border-b">
            <h3 className="font-medium">Recent Incidents</h3>
          </div>
          <div className="p-6">
            {incidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No incidents reported in the last 90 days.
              </p>
            ) : (
              <div className="space-y-6">
                {incidents.map((incident, i) => (
                  <div key={i} className="border-l-2 border-yellow-500 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{incident.title}</span>
                      <span className="text-xs text-muted-foreground">{incident.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{incident.description}</p>
                    <span className="text-xs text-green-600">{incident.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscribe */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Subscribe to status updates via{" "}
            <a href="mailto:status@verso.ink" className="text-primary hover:underline">
              email
            </a>
            {" "}or follow{" "}
            <a href="https://twitter.com/versoink" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              @versoink
            </a>
            {" "}on Twitter.
          </p>
        </div>
      </div>
    </div>
  )
}
