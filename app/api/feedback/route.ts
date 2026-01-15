import { z } from "zod"
import { createApiHandler, RateLimitError } from "@/lib/api"
import { rateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  subject: z.enum(["general", "support", "billing", "feedback", "partnership", "other"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
})

export const POST = createApiHandler({
  auth: "none",
  schema: feedbackSchema,
  handler: async ({ request, data }) => {
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`feedback:${ip}`, RATE_LIMITS.AUTH)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        "Too many requests. Please try again later.",
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      )
    }

    await sendFeedbackEmail(data)

    logger.info("Feedback submitted", {
      subject: data.subject,
      email: data.email,
    })

    return {
      success: true,
      message: "Thank you for your feedback. We'll get back to you soon.",
    }
  },
})

interface FeedbackData {
  name: string
  email: string
  subject: string
  message: string
}

async function sendFeedbackEmail(data: FeedbackData) {
  const resendApiKey = process.env.RESEND_API_KEY
  const feedbackTo = process.env.FEEDBACK_EMAIL || "hello@verso.ac"
  const emailFrom = process.env.EMAIL_FROM || "noreply@verso.ac"

  if (!resendApiKey) {
    logger.warn("RESEND_API_KEY not configured, skipping email send")
    return
  }

  const subjectLabels: Record<string, string> = {
    general: "General Inquiry",
    support: "Technical Support",
    billing: "Billing Question",
    feedback: "Feature Request",
    partnership: "Partnership",
    other: "Other",
  }

  const subjectLine = `[Verso Contact] ${subjectLabels[data.subject] || data.subject}: ${data.name}`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: feedbackTo,
        reply_to: data.email,
        subject: subjectLine,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #111;">New Contact Form Submission</h1>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; width: 120px; color: #666;">From:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #111;">${escapeHtml(data.name)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; color: #666;">Email:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #111;">
                  <a href="mailto:${escapeHtml(data.email)}" style="color: #0066cc;">${escapeHtml(data.email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: 500; color: #666;">Subject:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #111;">${subjectLabels[data.subject] || data.subject}</td>
              </tr>
            </table>

            <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #111;">Message:</h2>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #333;">
${escapeHtml(data.message)}
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              Reply directly to this email to respond to ${escapeHtml(data.name)}.
            </p>
          </div>
        `,
        text: `New Contact Form Submission

From: ${data.name}
Email: ${data.email}
Subject: ${subjectLabels[data.subject] || data.subject}

Message:
${data.message}

---
Reply to this email to respond to the sender.`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.error("Resend API error", undefined, { errorData })
    }
  } catch (error) {
    logger.error("Failed to send feedback email", error instanceof Error ? error : undefined)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
