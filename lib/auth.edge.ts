import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

// Edge-compatible auth config for middleware
// This config does NOT use PrismaAdapter or any database operations
// It only validates JWT tokens for route protection
export const { auth: authEdge } = NextAuth({
  // No adapter - purely JWT-based session verification
  session: {
    strategy: "jwt",
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
      // Authorize is never called in middleware - only JWT verification
      async authorize() {
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        // Plan type comes from Prisma, cast to avoid edge import issues
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
