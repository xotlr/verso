import { Plan } from "@prisma/client"
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      plan?: Plan
      username?: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    plan?: Plan
    username?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    plan?: Plan
    username?: string | null
    image?: string | null
    name?: string | null
  }
}
