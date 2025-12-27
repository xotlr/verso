import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test('homepage should have proper heading structure', async ({ page }) => {
    await page.goto('/')

    // Should have an h1
    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible()
  })

  test('homepage should have no empty links', async ({ page }) => {
    await page.goto('/')

    // All links should have accessible text
    const links = page.locator('a')
    const count = await links.count()

    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i)
      const text = await link.textContent()
      const ariaLabel = await link.getAttribute('aria-label')
      const title = await link.getAttribute('title')

      // Link should have some accessible text
      const hasAccessibleText = (text && text.trim().length > 0) || ariaLabel || title
      expect(hasAccessibleText).toBeTruthy()
    }
  })

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/login')

    // Email input should be labeled
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeVisible()

    // Password input should be labeled
    const passwordInput = page.getByLabel(/password/i)
    await expect(passwordInput).toBeVisible()
  })

  test('buttons should be focusable', async ({ page }) => {
    await page.goto('/')

    // Tab through the page and find focusable elements
    await page.keyboard.press('Tab')

    // Should be able to focus on interactive elements
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('page should have lang attribute', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    const lang = await html.getAttribute('lang')

    expect(lang).toBeTruthy()
  })
})

test.describe('Mobile Responsiveness', () => {
  test('homepage should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Page should load without horizontal scroll
    const body = page.locator('body')
    const scrollWidth = await body.evaluate((el) => el.scrollWidth)
    const clientWidth = await body.evaluate((el) => el.clientWidth)

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10) // Small tolerance
  })

  test('navigation should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Look for mobile menu button or navigation
    const menuButton = page.getByRole('button', { name: /menu/i })
    const nav = page.locator('nav')

    // Either there's a visible nav or a menu button
    const navVisible = await nav.isVisible().catch(() => false)
    const menuVisible = await menuButton.isVisible().catch(() => false)

    expect(navVisible || menuVisible).toBeTruthy()
  })
})
