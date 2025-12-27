import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')

    // Check that the page loads
    await expect(page).toHaveTitle(/Verso/i)
  })

  test('should have navigation links', async ({ page }) => {
    await page.goto('/')

    // Check for main navigation elements (Pricing is in navbar, About is in footer)
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /features/i }).first()).toBeVisible()
  })

  test('should have a call-to-action button', async ({ page }) => {
    await page.goto('/')

    // Look for signup/get started button
    const ctaButton = page.getByRole('link', { name: /get started|sign up|try|start/i }).first()
    await expect(ctaButton).toBeVisible()
  })

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/')

    // Click the pricing link and wait for navigation
    await Promise.all([
      page.waitForURL(/pricing/),
      page.getByRole('link', { name: /pricing/i }).first().click(),
    ])

    await expect(page).toHaveURL(/pricing/)
  })

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/')

    // About link is in the footer, scroll to it first
    const aboutLink = page.getByRole('link', { name: /about/i }).first()
    await aboutLink.scrollIntoViewIfNeeded()

    // Click and wait for navigation
    await Promise.all([
      page.waitForURL(/about/),
      aboutLink.click(),
    ])

    await expect(page).toHaveURL(/about/)
  })
})

test.describe('Pricing Page', () => {
  test('should load pricing page', async ({ page }) => {
    await page.goto('/pricing')

    // Should have pricing content
    await expect(page.getByText(/free|plus|pro/i).first()).toBeVisible()
  })

  test('should display pricing tiers', async ({ page }) => {
    await page.goto('/pricing')

    // Check for pricing elements
    await expect(page.getByText(/month|year/i).first()).toBeVisible()
  })
})

test.describe('About Page', () => {
  test('should load about page', async ({ page }) => {
    await page.goto('/about')

    await expect(page).toHaveURL(/about/)
  })
})

test.describe('Legal Pages', () => {
  test('should load privacy policy', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page).toHaveURL(/privacy/)
  })

  test('should load terms of service', async ({ page }) => {
    await page.goto('/terms')

    await expect(page).toHaveURL(/terms/)
  })
})
