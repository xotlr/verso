import { test, expect } from '@playwright/test'

test.describe('Editor Access (Unauthenticated)', () => {
  test('should redirect to login when accessing editor without auth', async ({ page }) => {
    // Try to access a screenplay editor without being logged in
    await page.goto('/screenplay/test-id')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('should redirect to login when accessing home without auth', async ({ page }) => {
    await page.goto('/home')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

})

test.describe('Public Timelapse Viewer', () => {
  test('should load timelapse page for invalid share ID', async ({ page }) => {
    await page.goto('/timelapse/invalid-share-id')

    // The page should load without crashing
    await expect(page.locator('body')).toBeVisible()
  })

  test('timelapse page should have basic structure', async ({ page }) => {
    await page.goto('/timelapse/test-share-id')

    // Page should load (even if timelapse doesn't exist)
    await expect(page.locator('body')).toBeVisible()
  })
})
