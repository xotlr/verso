/**
 * Security Alerting System
 *
 * Provides centralized security event alerting that can notify via:
 * - Structured logging (always)
 * - Webhook notifications (Slack, Discord, etc.)
 * - Email notifications (via Resend)
 *
 * SECURITY: "Great logging with no alerting is of minimal value" - OWASP 2025
 */

import { logger } from "@/lib/logger"

export type AlertSeverity = "low" | "medium" | "high" | "critical"

export type SecurityEventType =
  | "auth_failure_spike"
  | "rate_limit_violation"
  | "suspicious_login"
  | "account_lockout"
  | "permission_escalation_attempt"
  | "csrf_violation"
  | "invalid_token"
  | "admin_action"
  | "data_export"
  | "subscription_fraud"
  | "webhook_signature_invalid"

interface SecurityAlert {
  type: SecurityEventType
  severity: AlertSeverity
  message: string
  details?: Record<string, unknown>
  userId?: string
  ip?: string
  timestamp?: string
}

interface AlertThreshold {
  count: number
  windowMs: number
}

// In-memory tracking for rate-based alerts (e.g., 10 failed logins in 5 min)
const eventCounts = new Map<string, { count: number; firstSeen: number }>()

// Alert thresholds for automatic escalation
const ALERT_THRESHOLDS: Partial<Record<SecurityEventType, AlertThreshold>> = {
  auth_failure_spike: { count: 10, windowMs: 5 * 60 * 1000 }, // 10 failures in 5 min
  rate_limit_violation: { count: 50, windowMs: 15 * 60 * 1000 }, // 50 violations in 15 min
  csrf_violation: { count: 5, windowMs: 60 * 1000 }, // 5 CSRF violations in 1 min
  webhook_signature_invalid: { count: 3, windowMs: 60 * 1000 }, // 3 invalid signatures in 1 min
}

/**
 * Send a security alert.
 * Always logs, optionally sends to webhook/email based on severity and config.
 */
export async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
  const timestamp = alert.timestamp || new Date().toISOString()

  // Always log the security event
  const logMeta = {
    alertType: alert.type,
    severity: alert.severity,
    userId: alert.userId,
    ip: alert.ip,
    ...alert.details,
  }

  if (alert.severity === "critical" || alert.severity === "high") {
    logger.error(`[SECURITY ALERT] ${alert.message}`, undefined, logMeta)
  } else {
    logger.security(alert.message, logMeta)
  }

  // Check if we should send external notification
  const shouldNotify = shouldSendExternalAlert(alert)
  if (!shouldNotify) return

  // Send to webhook if configured
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL
  if (webhookUrl) {
    await sendWebhookAlert(webhookUrl, alert, timestamp)
  }

  // Send email for critical alerts if configured
  if (alert.severity === "critical" && process.env.SECURITY_ALERT_EMAIL) {
    await sendEmailAlert(alert, timestamp)
  }
}

/**
 * Track a security event and alert if threshold is exceeded.
 * Use this for events that should trigger alerts based on frequency.
 */
export async function trackSecurityEvent(
  type: SecurityEventType,
  identifier: string, // e.g., IP address, user ID
  details?: Record<string, unknown>
): Promise<void> {
  const key = `${type}:${identifier}`
  const now = Date.now()
  const threshold = ALERT_THRESHOLDS[type]

  // Get or create tracking entry
  let entry = eventCounts.get(key)
  if (!entry || now - entry.firstSeen > (threshold?.windowMs || 300000)) {
    entry = { count: 0, firstSeen: now }
  }

  entry.count++
  eventCounts.set(key, entry)

  // Check if threshold exceeded
  if (threshold && entry.count >= threshold.count) {
    await sendSecurityAlert({
      type,
      severity: "high",
      message: `${type} threshold exceeded: ${entry.count} events in ${Math.round((now - entry.firstSeen) / 1000)}s`,
      details: { identifier, eventCount: entry.count, ...details },
    })

    // Reset counter after alerting
    eventCounts.delete(key)
  }
}

/**
 * Determine if we should send an external alert based on severity and config.
 */
function shouldSendExternalAlert(alert: SecurityAlert): boolean {
  // Always alert on critical
  if (alert.severity === "critical") return true

  // Alert on high severity if webhook is configured
  if (alert.severity === "high" && process.env.SECURITY_ALERT_WEBHOOK_URL) {
    return true
  }

  // Check minimum severity threshold
  const minSeverity = process.env.SECURITY_ALERT_MIN_SEVERITY || "high"
  const severityOrder: AlertSeverity[] = ["low", "medium", "high", "critical"]
  const alertLevel = severityOrder.indexOf(alert.severity)
  const minLevel = severityOrder.indexOf(minSeverity as AlertSeverity)

  return alertLevel >= minLevel
}

/**
 * Send alert to webhook (Slack, Discord, custom).
 */
async function sendWebhookAlert(
  webhookUrl: string,
  alert: SecurityAlert,
  timestamp: string
): Promise<void> {
  try {
    // Detect webhook type and format accordingly
    const isSlack = webhookUrl.includes("hooks.slack.com")
    const isDiscord = webhookUrl.includes("discord.com/api/webhooks")

    const payload = isSlack
      ? formatSlackPayload(alert, timestamp)
      : isDiscord
        ? formatDiscordPayload(alert, timestamp)
        : formatGenericPayload(alert, timestamp)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      logger.error("Failed to send security alert webhook", undefined, {
        status: response.status,
        alertType: alert.type,
      })
    }
  } catch (error) {
    logger.error(
      "Error sending security alert webhook",
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Send critical alert via email.
 */
async function sendEmailAlert(alert: SecurityAlert, timestamp: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const alertEmail = process.env.SECURITY_ALERT_EMAIL
  const emailFrom = process.env.EMAIL_FROM || "security@verso.ac"

  if (!resendApiKey || !alertEmail) return

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: alertEmail,
        subject: `[CRITICAL] Security Alert: ${alert.type}`,
        text: `
Security Alert - ${alert.severity.toUpperCase()}

Type: ${alert.type}
Time: ${timestamp}
Message: ${alert.message}

Details:
${JSON.stringify(alert.details, null, 2)}

User ID: ${alert.userId || "N/A"}
IP Address: ${alert.ip || "N/A"}

---
Verso Security System
        `.trim(),
      }),
    })
  } catch (error) {
    logger.error(
      "Error sending security alert email",
      error instanceof Error ? error : undefined
    )
  }
}

// Webhook payload formatters

function formatSlackPayload(alert: SecurityAlert, timestamp: string) {
  const severityEmoji = {
    low: "ℹ️",
    medium: "⚠️",
    high: "🚨",
    critical: "🔴",
  }

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${severityEmoji[alert.severity]} Security Alert: ${alert.type}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Severity:*\n${alert.severity.toUpperCase()}` },
          { type: "mrkdwn", text: `*Time:*\n${timestamp}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Message:*\n${alert.message}` },
      },
      ...(alert.details
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Details:*\n\`\`\`${JSON.stringify(alert.details, null, 2)}\`\`\``,
              },
            },
          ]
        : []),
    ],
  }
}

function formatDiscordPayload(alert: SecurityAlert, timestamp: string) {
  const severityColor = {
    low: 0x3498db, // blue
    medium: 0xf39c12, // orange
    high: 0xe74c3c, // red
    critical: 0x9b59b6, // purple
  }

  return {
    embeds: [
      {
        title: `Security Alert: ${alert.type}`,
        description: alert.message,
        color: severityColor[alert.severity],
        fields: [
          { name: "Severity", value: alert.severity.toUpperCase(), inline: true },
          { name: "Time", value: timestamp, inline: true },
          ...(alert.userId ? [{ name: "User ID", value: alert.userId, inline: true }] : []),
          ...(alert.ip ? [{ name: "IP Address", value: alert.ip, inline: true }] : []),
          ...(alert.details
            ? [{ name: "Details", value: `\`\`\`json\n${JSON.stringify(alert.details, null, 2)}\`\`\`` }]
            : []),
        ],
        timestamp,
      },
    ],
  }
}

function formatGenericPayload(alert: SecurityAlert, timestamp: string) {
  return {
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    timestamp,
    userId: alert.userId,
    ip: alert.ip,
    details: alert.details,
  }
}

// Convenience functions for common security events

export async function alertAuthFailure(ip: string, email?: string): Promise<void> {
  await trackSecurityEvent("auth_failure_spike", ip, { email })
}

export async function alertRateLimitViolation(
  identifier: string,
  endpoint: string
): Promise<void> {
  await trackSecurityEvent("rate_limit_violation", identifier, { endpoint })
}

export async function alertSuspiciousLogin(
  userId: string,
  ip: string,
  reason: string,
  details?: Record<string, unknown>
): Promise<void> {
  await sendSecurityAlert({
    type: "suspicious_login",
    severity: "medium",
    message: `Suspicious login detected: ${reason}`,
    userId,
    ip,
    details,
  })
}

export async function alertCsrfViolation(ip: string, origin?: string): Promise<void> {
  await trackSecurityEvent("csrf_violation", ip, { origin })
}

export async function alertAdminAction(
  userId: string,
  action: string,
  target: string,
  details?: Record<string, unknown>
): Promise<void> {
  await sendSecurityAlert({
    type: "admin_action",
    severity: "low",
    message: `Admin action: ${action} on ${target}`,
    userId,
    details,
  })
}

export async function alertWebhookSignatureInvalid(
  source: string,
  ip?: string
): Promise<void> {
  await trackSecurityEvent("webhook_signature_invalid", source, { ip })
}

// Cleanup old entries periodically (call from cron)
export function cleanupEventTracking(): void {
  const now = Date.now()
  const maxAge = 30 * 60 * 1000 // 30 minutes

  for (const [key, entry] of eventCounts.entries()) {
    if (now - entry.firstSeen > maxAge) {
      eventCounts.delete(key)
    }
  }
}
