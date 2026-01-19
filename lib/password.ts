/**
 * Password hashing utilities.
 * Uses bcrypt for secure password hashing.
 */

import bcrypt from "bcryptjs"

/** Number of salt rounds for bcrypt (12 is a good balance of security and performance) */
const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt.
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a plain text password with a hashed password.
 * @param password - Plain text password
 * @param hashedPassword - Hashed password to compare against
 * @returns Whether the passwords match
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
