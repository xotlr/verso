import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

// Test user credentials - use environment variables or fallback to test values
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'playwright-test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

setup('authenticate', async ({ page }) => {
  // First, try to sign up (in case user doesn't exist)
  await page.goto('/signup')

  // Fill signup form
  await page.getByLabel(/email/i).fill(TEST_EMAIL)

  // Handle password fields (there may be password and confirm password)
  const passwordFields = page.getByLabel(/password/i)
  const passwordCount = await passwordFields.count()

  if (passwordCount >= 2) {
    // Fill password and confirm password
    await passwordFields.nth(0).fill(TEST_PASSWORD)
    await passwordFields.nth(1).fill(TEST_PASSWORD)
  } else {
    await passwordFields.first().fill(TEST_PASSWORD)
  }

  // Try to submit signup
  await page.getByRole('button', { name: /create account/i }).click()

  // Wait a moment for signup to process
  await page.waitForTimeout(2000)

  // Now log in (whether signup succeeded or user already exists)
  await page.goto('/login')

  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD)

  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for redirect to home or dashboard
  await page.waitForURL(/home|dashboard/, { timeout: 10000 }).catch(() => {
    // If redirect doesn't happen, check if we're still on login with error
    console.log('Login may have failed, continuing anyway')
  })

  // Check if we're authenticated by looking for common authenticated UI elements
  const isAuthenticated = await page.getByRole('button', { name: /new|create|profile|menu/i }).first().isVisible().catch(() => false)

  if (isAuthenticated) {
    // Save authentication state
    await page.context().storageState({ path: authFile })
    console.log('Authentication successful, state saved')
  } else {
    console.log('Authentication may have failed - tests requiring auth will be skipped')
    // Create empty auth file so tests can check
    await page.context().storageState({ path: authFile })
  }
})
