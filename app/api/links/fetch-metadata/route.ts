import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchUrlMetadata, detectLinkCategory } from "@/lib/url-metadata"
import { z } from "zod"

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
}

// SSRF protection - block internal/dangerous URLs
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP metadata endpoint
]

const BLOCKED_HOSTNAME_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.x.x.x
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16-31.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.x.x
  /\.local$/i, // .local domains
  /\.internal$/i, // .internal domains
]

function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    // Check protocol - only allow http and https
    if (!["http:", "https:"].includes(url.protocol)) {
      return true
    }

    // Check against blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return true
    }

    // Check against blocked patterns
    if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return true
    }

    return false
  } catch {
    return true // Invalid URL, block it
  }
}

// Validation schema
const fetchMetadataSchema = z.object({
  url: z.string().url("Invalid URL"),
})

// POST /api/links/fetch-metadata - Fetch metadata for a URL
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limit check
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const result = fetchMetadataSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { url } = result.data

    // SSRF protection - block internal/dangerous URLs
    if (isBlockedUrl(url)) {
      return NextResponse.json(
        { error: "URL not allowed" },
        { status: 400 }
      )
    }

    // Fetch metadata
    const metadata = await fetchUrlMetadata(url)
    const category = detectLinkCategory(url)

    return NextResponse.json({
      ...metadata,
      category,
    })
  } catch (error) {
    console.error("Error fetching metadata:", error)
    return NextResponse.json(
      { error: "Failed to fetch URL metadata" },
      { status: 500 }
    )
  }
}
