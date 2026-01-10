import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// Get cookie domain for subdomain sharing
// Leading dot = all subdomains can access the cookie
const getCookieDomain = () => {
  // Production: enable cookie sharing between verso.ac and app.verso.ac
  if (process.env.NODE_ENV === "production") {
    return ".verso.ac"
  }
  // Development (localhost): no subdomain cookie sharing needed
  return undefined
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: getCookieDomain(),
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        // SECURITY: Always run bcrypt comparison to prevent timing attacks
        // that could reveal whether an email exists in the system.
        // Use a dummy hash when user doesn't exist to maintain constant time.
        const DUMMY_HASH = "$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        const passwordToCompare = user?.password || DUMMY_HASH

        const isValid = await bcrypt.compare(
          credentials.password as string,
          passwordToCompare
        )

        // Only return user if they exist, have a password, AND password is valid
        if (!user || !user.password || !isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL

      // Build allowlist of valid origins
      const allowedOrigins: string[] = []
      try {
        allowedOrigins.push(new URL(baseUrl).origin)
      } catch {}
      if (appUrl) {
        try {
          allowedOrigins.push(new URL(appUrl).origin)
        } catch {}
      }

      // Parse and validate the redirect URL
      try {
        const parsed = new URL(url)
        if (allowedOrigins.includes(parsed.origin)) {
          // Safe redirect to allowed origin - but avoid login loops
          if (parsed.pathname === "/login" || parsed.pathname === "/signup") {
            return appUrl || `${baseUrl}/home`
          }
          return url
        }
      } catch {
        // Invalid URL - check if it's a safe relative path
        // SECURITY: Reject protocol-relative URLs (//evil.com) and other edge cases
        if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) {
          // Relative paths are safe - avoid login loops
          if (url === "/login" || url === "/signup") {
            return appUrl || `${baseUrl}/home`
          }
          return `${baseUrl}${url}`
        }
      }

      // Default: redirect to app or home
      return appUrl || `${baseUrl}/home`
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        // Fetch user data on initial sign-in and store in token
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true, image: true, name: true, username: true },
        })
        token.plan = dbUser?.plan || "FREE"
        token.image = dbUser?.image
        token.name = dbUser?.name
        token.username = dbUser?.username
      }
      // Refresh user data when session is updated (after profile changes)
      if (trigger === "update" && token.id) {
        // Accept data passed from updateSession() call
        if (session?.user) {
          if (session.user.image !== undefined) {
            token.image = session.user.image
          }
          if (session.user.name !== undefined) {
            token.name = session.user.name
          }
          if (session.user.username !== undefined) {
            token.username = session.user.username
          }
        }
        // Also verify/refresh plan from database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true },
        })
        if (dbUser) {
          token.plan = dbUser.plan || "FREE"
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        // Read user data from token - no DB access needed (edge-compatible)
        session.user.plan = token.plan
        session.user.image = token.image as string | null | undefined
        session.user.name = token.name as string | null | undefined
        session.user.username = token.username as string | null | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})

// Helper function to hash passwords for signup
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
