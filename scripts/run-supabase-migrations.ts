/**
 * Supabase Migration Runner
 *
 * Runs SQL migrations against the Supabase database.
 * Uses the DIRECT_URL for direct PostgreSQL connection.
 *
 * Usage:
 *   npx tsx scripts/run-supabase-migrations.ts
 *   npx tsx scripts/run-supabase-migrations.ts --dry-run
 *   npx tsx scripts/run-supabase-migrations.ts --migration=00001
 */

import { config } from "dotenv"
// Load environment variables from .env.local and .env
config({ path: ".env.local" })
config({ path: ".env" })

import postgres from "postgres"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const SPECIFIC_MIGRATION = args.find((a) => a.startsWith("--migration="))?.split("=")[1]

// Get database URL from environment
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("ERROR: DIRECT_URL or DATABASE_URL environment variable is required")
  console.error("Please set it in your .env.local file")
  process.exit(1)
}

// Migration tracking table
const MIGRATIONS_TABLE = "_supabase_migrations"

interface MigrationRecord {
  name: string
  executed_at: Date
}

async function ensureMigrationsTable(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

async function getExecutedMigrations(sql: postgres.Sql): Promise<Set<string>> {
  const result = await sql<MigrationRecord[]>`
    SELECT name FROM ${sql(MIGRATIONS_TABLE)}
  `
  return new Set(result.map((r) => r.name))
}

async function recordMigration(sql: postgres.Sql, name: string) {
  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (name)
    VALUES (${name})
  `
}

function getMigrationFiles(): string[] {
  const migrationsDir = join(process.cwd(), "supabase", "migrations")

  try {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()

    if (SPECIFIC_MIGRATION) {
      return files.filter((f) => f.startsWith(SPECIFIC_MIGRATION))
    }

    return files
  } catch {
    console.error(`ERROR: Could not read migrations directory: ${migrationsDir}`)
    process.exit(1)
  }
}

async function runMigration(sql: postgres.Sql, filename: string): Promise<void> {
  const migrationsDir = join(process.cwd(), "supabase", "migrations")
  const filepath = join(migrationsDir, filename)

  console.log(`\nRunning migration: ${filename}`)
  console.log("-".repeat(60))

  const content = readFileSync(filepath, "utf-8")

  if (DRY_RUN) {
    console.log("[DRY RUN] Would execute:")
    console.log(content.slice(0, 500) + (content.length > 500 ? "\n... (truncated)" : ""))
    return
  }

  try {
    // Execute the entire migration as a single transaction
    await sql.unsafe(content)
    await recordMigration(sql, filename)
    console.log(`SUCCESS: ${filename}`)
  } catch (error) {
    console.error(`FAILED: ${filename}`)
    throw error
  }
}

async function main() {
  console.log("=".repeat(60))
  console.log("Supabase Migration Runner")
  console.log("=".repeat(60))
  console.log(`Dry run: ${DRY_RUN}`)
  console.log()

  // Connect to database
  const sql = postgres(DATABASE_URL!, {
    max: 1,
    onnotice: () => {}, // Suppress NOTICE messages
  })

  try {
    // Test connection
    console.log("Connecting to database...")
    await sql`SELECT 1`
    console.log("Connected successfully!\n")

    // Ensure migrations table exists
    if (!DRY_RUN) {
      await ensureMigrationsTable(sql)
    }

    // Get list of already executed migrations
    const executed = DRY_RUN ? new Set<string>() : await getExecutedMigrations(sql)
    console.log(`Previously executed migrations: ${executed.size}`)

    // Get migration files to run
    const migrations = getMigrationFiles()
    console.log(`Found ${migrations.length} migration file(s)`)

    // Filter out already executed migrations
    const pendingMigrations = migrations.filter((m) => !executed.has(m))
    console.log(`Pending migrations: ${pendingMigrations.length}`)

    if (pendingMigrations.length === 0) {
      console.log("\nNo pending migrations to run.")
      return
    }

    // Run each migration
    let successful = 0
    let failed = 0

    for (const migration of pendingMigrations) {
      try {
        await runMigration(sql, migration)
        successful++
      } catch (error) {
        failed++
        console.error("\nMigration error:", error)
        console.error("\nStopping migration due to error.")
        break
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("Migration Summary")
    console.log("=".repeat(60))
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    console.log(`Skipped: ${migrations.length - successful - failed}`)

    if (DRY_RUN) {
      console.log("\n[DRY RUN] No changes were made to the database.")
    }

  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
