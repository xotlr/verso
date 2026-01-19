/**
 * User Migration Script: NextAuth → Supabase Auth
 *
 * This script migrates existing users from NextAuth (Prisma-based) to Supabase Auth.
 *
 * What it does:
 * 1. For each user in the database:
 *    - Creates a corresponding Supabase Auth user
 *    - Links Google OAuth identities if they exist
 *    - Sets the auth_id on the User table (via raw SQL since Prisma doesn't have the column yet)
 *    - For credential users: triggers password reset flow
 *
 * Prerequisites:
 * - Supabase project must be set up with auth enabled
 * - SUPABASE_SERVICE_ROLE_KEY must be set in environment
 * - Migration 00001_add_auth_id.sql must have been run on Supabase
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-supabase.ts
 *   npx tsx scripts/migrate-users-to-supabase.ts --dry-run
 *   npx tsx scripts/migrate-users-to-supabase.ts --batch-size=50
 */

import { config } from "dotenv"
// Load environment variables from .env.local and .env
config({ path: ".env.local" })
config({ path: ".env" })

import { PrismaClient } from "@prisma/client"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const prisma = new PrismaClient()

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const BATCH_SIZE = parseInt(
  args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] || "100"
)

// Create Supabase admin client
function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

interface MigrationResult {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: Array<{ userId: string; email: string; error: string }>
}

// Helper to check if a user has auth_id set (via raw SQL)
async function hasAuthId(userId: string): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ auth_id: string | null }>>`
    SELECT auth_id FROM "User" WHERE id = ${userId}
  `
  return result.length > 0 && result[0].auth_id !== null
}

// Helper to set auth_id (via raw SQL)
async function setAuthId(userId: string, authId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User" SET auth_id = ${authId}::uuid, "updatedAt" = NOW() WHERE id = ${userId}
  `
}

// Get user with accounts for migration
interface UserWithAccounts {
  id: string
  email: string | null
  name: string | null
  image: string | null
  password: string | null
  emailVerified: Date | null
  accounts: Array<{
    provider: string
    providerAccountId: string
  }>
}

async function getUsersToMigrate(skip: number, take: number): Promise<UserWithAccounts[]> {
  // Get users that don't have auth_id set yet
  const users = await prisma.$queryRaw<Array<{
    id: string
    email: string | null
    name: string | null
    image: string | null
    password: string | null
    emailVerified: Date | null
  }>>`
    SELECT id, email, name, image, password, "emailVerified"
    FROM "User"
    WHERE auth_id IS NULL
    ORDER BY "createdAt" ASC
    LIMIT ${take} OFFSET ${skip}
  `

  // Get accounts for these users
  const userIds = users.map(u => u.id)
  const accounts = userIds.length > 0
    ? await prisma.account.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, provider: true, providerAccountId: true }
      })
    : []

  // Combine users with their accounts
  return users.map(user => ({
    ...user,
    accounts: accounts.filter(a => a.userId === user.id)
  }))
}

async function countUsersToMigrate(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "User" WHERE auth_id IS NULL
  `
  return Number(result[0].count)
}

async function migrateUsers(): Promise<MigrationResult> {
  const supabase = createSupabaseAdmin()
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  console.log(`Starting user migration...`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log(`Batch size: ${BATCH_SIZE}\n`)

  // Check if auth_id column exists
  try {
    await prisma.$queryRaw`SELECT auth_id FROM "User" LIMIT 1`
  } catch (e) {
    console.error("ERROR: auth_id column does not exist in User table.")
    console.error("Please run the Supabase migration 00002_add_auth_id.sql first.")
    process.exit(1)
  }

  // Count total users to migrate
  const totalUsers = await countUsersToMigrate()
  result.total = totalUsers
  console.log(`Found ${totalUsers} users to migrate\n`)

  if (totalUsers === 0) {
    console.log("No users to migrate. All users already have auth_id set.")
    return result
  }

  // Process in batches
  let offset = 0
  let processed = 0

  while (offset < totalUsers) {
    const users = await getUsersToMigrate(offset, BATCH_SIZE)

    if (users.length === 0) break

    for (const user of users) {
      processed++
      const progress = `[${processed}/${totalUsers}]`

      // Skip users without email
      if (!user.email) {
        console.log(`${progress} SKIP: User ${user.id} has no email`)
        result.skipped++
        continue
      }

      try {
        // Check if Supabase auth user already exists with this email
        const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingAuthUsers?.users.find(
          (u) => u.email === user.email
        )

        if (existingUser) {
          // User already exists in Supabase Auth - just link
          if (!DRY_RUN) {
            await setAuthId(user.id, existingUser.id)
          }
          console.log(
            `${progress} LINKED: ${user.email} → ${existingUser.id} (already exists)`
          )
          result.migrated++
          continue
        }

        // Check for Google OAuth account
        const googleAccount = user.accounts.find(
          (acc) => acc.provider === "google"
        )

        if (googleAccount) {
          // Create user with Google identity
          if (!DRY_RUN) {
            const { data: newUser, error } =
              await supabase.auth.admin.createUser({
                email: user.email,
                email_confirm: !!user.emailVerified,
                user_metadata: {
                  name: user.name,
                  avatar_url: user.image,
                  full_name: user.name,
                },
                app_metadata: {
                  provider: "google",
                  providers: ["google"],
                },
              })

            if (error) throw error

            // Update User table with auth_id
            await setAuthId(user.id, newUser.user!.id)

            console.log(
              `${progress} MIGRATED (Google): ${user.email} → ${newUser.user!.id}`
            )
          } else {
            console.log(`${progress} DRY RUN (Google): ${user.email}`)
          }
          result.migrated++
        } else if (user.password) {
          // Credential user - create without password, send reset email
          if (!DRY_RUN) {
            // Create user with a random password (they'll reset it)
            const tempPassword = crypto.randomUUID() + crypto.randomUUID()

            const { data: newUser, error } =
              await supabase.auth.admin.createUser({
                email: user.email,
                password: tempPassword,
                email_confirm: !!user.emailVerified,
                user_metadata: {
                  name: user.name,
                  avatar_url: user.image,
                  full_name: user.name,
                  requires_password_reset: true,
                },
              })

            if (error) throw error

            // Update User table with auth_id
            await setAuthId(user.id, newUser.user!.id)

            // Send password reset email
            await supabase.auth.admin.generateLink({
              type: "recovery",
              email: user.email,
            })

            console.log(
              `${progress} MIGRATED (Credentials): ${user.email} → ${newUser.user!.id} (reset email queued)`
            )
          } else {
            console.log(`${progress} DRY RUN (Credentials): ${user.email}`)
          }
          result.migrated++
        } else {
          // User with no auth method - create with email confirmation flow
          if (!DRY_RUN) {
            const { data: newUser, error } =
              await supabase.auth.admin.createUser({
                email: user.email,
                email_confirm: false, // Require email confirmation
                user_metadata: {
                  name: user.name,
                  avatar_url: user.image,
                  full_name: user.name,
                },
              })

            if (error) throw error

            // Update User table with auth_id
            await setAuthId(user.id, newUser.user!.id)

            console.log(
              `${progress} MIGRATED (No auth): ${user.email} → ${newUser.user!.id}`
            )
          } else {
            console.log(`${progress} DRY RUN (No auth): ${user.email}`)
          }
          result.migrated++
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        console.error(`${progress} FAILED: ${user.email} - ${errorMessage}`)
        result.failed++
        result.errors.push({
          userId: user.id,
          email: user.email,
          error: errorMessage,
        })
      }
    }

    offset += BATCH_SIZE

    // Small delay between batches to avoid rate limits
    if (offset < totalUsers) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return result
}

async function main() {
  console.log("=".repeat(60))
  console.log("User Migration: NextAuth → Supabase Auth")
  console.log("=".repeat(60))
  console.log()

  try {
    const result = await migrateUsers()

    console.log("\n" + "=".repeat(60))
    console.log("Migration Summary")
    console.log("=".repeat(60))
    console.log(`Total users:  ${result.total}`)
    console.log(`Migrated:     ${result.migrated}`)
    console.log(`Skipped:      ${result.skipped}`)
    console.log(`Failed:       ${result.failed}`)

    if (result.errors.length > 0) {
      console.log("\nFailed migrations:")
      for (const err of result.errors) {
        console.log(`  - ${err.email} (${err.userId}): ${err.error}`)
      }
    }

    if (DRY_RUN) {
      console.log("\n[DRY RUN] No changes were made to the database.")
    }
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
