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

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
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
      // After login, redirect to app subdomain workspace
      // Use NEXT_PUBLIC_APP_URL env var, or construct from baseUrl
      const appUrl = process.env.NEXT_PUBLIC_APP_URL

      // Safety: Don't redirect to login/signup pages on app subdomain (would cause loop)
      if (url.includes("app.") && (url.includes("/login") || url.includes("/signup"))) {
        return appUrl || `${baseUrl}/workspace`
      }

      // If there's a callback URL that points to the app subdomain, use it
      if (url.includes("app.") || url.includes("/workspace") || url.includes("/editor")) {
        return url
      }

      // If we have an app URL configured, redirect there
      if (appUrl) {
        return appUrl
      }

      // Default: redirect to workspace on same origin
      // (middleware will handle redirect to app subdomain)
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/workspace`
      }

      return url
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // Fetch plan on initial sign-in and store in token
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true },
        })
        token.plan = dbUser?.plan || "FREE"
      }
      // Refresh plan when session is updated
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true },
        })
        token.plan = dbUser?.plan || "FREE"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        // Read plan from token - no DB access needed (edge-compatible)
        session.user.plan = token.plan
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
