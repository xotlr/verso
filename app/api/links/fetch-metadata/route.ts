import { z } from "zod"
import { promises as dns } from "dns"
import { createApiHandler, BadRequestError, RateLimitError } from "@/lib/api"
import { fetchUrlMetadata, detectLinkCategory } from "@/lib/url-metadata"

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60 * 1000

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

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
]

const BLOCKED_HOSTNAME_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /\.local$/i,
  /\.internal$/i,
]

function isPrivateIP(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("127.")) return true
  if (ip.startsWith("169.254.")) return true
  if (ip.startsWith("10.")) return true
  if (ip.startsWith("192.168.")) return true

  const parts = ip.split(".")
  if (parts[0] === "172") {
    const second = parseInt(parts[1], 10)
    if (second >= 16 && second <= 31) return true
  }

  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true

  return false
}

async function isBlockedUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    if (!["http:", "https:"].includes(url.protocol)) return true
    if (BLOCKED_HOSTNAMES.includes(hostname)) return true
    if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname))) return true

    try {
      const addresses = await dns.resolve4(hostname)
      for (const ip of addresses) {
        if (isPrivateIP(ip)) return true
      }
    } catch {
      try {
        const addresses = await dns.resolve6(hostname)
        for (const ip of addresses) {
          if (isPrivateIP(ip)) return true
        }
      } catch {
        return true
      }
    }

    return false
  } catch {
    return true
  }
}

const fetchMetadataSchema = z.object({
  url: z.string().url("Invalid URL"),
})

export const POST = createApiHandler({
  auth: "required",
  schema: fetchMetadataSchema,
  handler: async ({ user, data }) => {
    if (!checkRateLimit(user.id)) {
      throw new RateLimitError()
    }

    const { url } = data

    if (await isBlockedUrl(url)) {
      throw new BadRequestError("URL not allowed")
    }

    const metadata = await fetchUrlMetadata(url)
    const category = detectLinkCategory(url)

    return { ...metadata, category }
  },
})
