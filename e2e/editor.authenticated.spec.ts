import { test, expect } from '@playwright/test'

// Check if we're actually authenticated by trying to access home
async function isAuthenticated(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/home')
  // Wait for either redirect to login or page to load
  await page.waitForTimeout(2000)
  const url = page.url()
  return !url.includes('/login')
}

test.describe('Authenticated Editor Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Check authentication status
    const authenticated = await isAuthenticated(page)
    if (!authenticated) {
      test.skip(true, 'Not authenticated - requires test user setup')
    }
  })

  test.describe('Home/Dashboard', () => {
    test('should display home page when authenticated', async ({ page }) => {
      await page.goto('/home')

      // Should not redirect to login
      await expect(page).not.toHaveURL(/login/)

      // Should show the home page content
      await expect(page.locator('body')).toBeVisible()
    })

    test('should have new screenplay button', async ({ page }) => {
      await page.goto('/home')

      // Look for create/new button
      const newButton = page.getByRole('button', { name: /new|create/i }).first()
      await expect(newButton).toBeVisible()
    })

    test('should open new screenplay dialog', async ({ page }) => {
      await page.goto('/home')

      // Click new button
      const newButton = page.getByRole('button', { name: /new|create/i }).first()
      await newButton.click()

      // Should open a dialog/modal
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Screenplay Creation', () => {
    test('should create a new screenplay', async ({ page }) => {
      await page.goto('/home')

      // Click new button
      await page.getByRole('button', { name: /new|create/i }).first().click()

      // Wait for dialog
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Fill in screenplay details
      const titleInput = dialog.getByLabel(/title/i).or(dialog.getByPlaceholder(/title/i))
      if (await titleInput.isVisible()) {
        await titleInput.fill('Playwright Test Screenplay')
      }

      // Select screenplay type if there's a dropdown
      const typeSelect = dialog.getByRole('combobox').first()
      if (await typeSelect.isVisible().catch(() => false)) {
        await typeSelect.click()
        await page.getByRole('option', { name: /film|feature/i }).first().click()
      }

      // Submit the form
      const createButton = dialog.getByRole('button', { name: /create|start|continue/i })
      await createButton.click()

      // Should navigate to editor
      await expect(page).toHaveURL(/screenplay\//, { timeout: 10000 })
    })
  })

  test.describe('Editor Interface', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/home')

      // Check auth again
      if (page.url().includes('/login')) {
        test.skip(true, 'Not authenticated')
        return
      }

      // Try to open an existing screenplay or create new
      const screenplayCard = page.locator('[data-testid="screenplay-card"]').first()
        .or(page.getByRole('link', { name: /screenplay|untitled/i }).first())

      if (await screenplayCard.isVisible().catch(() => false)) {
        await screenplayCard.click()
        await expect(page).toHaveURL(/screenplay\//, { timeout: 10000 })
      } else {
        // Create new screenplay
        await page.getByRole('button', { name: /new|create/i }).first().click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('button', { name: /create|start|continue/i }).first().click()
        await expect(page).toHaveURL(/screenplay\//, { timeout: 10000 })
      }
    })

    test('should display editor with ProseMirror', async ({ page }) => {
      // Editor should have ProseMirror element
      const editor = page.locator('.ProseMirror').first()
      await expect(editor).toBeVisible({ timeout: 10000 })
    })

    test('should be able to type in editor', async ({ page }) => {
      const editor = page.locator('.ProseMirror').first()
      await expect(editor).toBeVisible({ timeout: 10000 })

      // Click in editor and type
      await editor.click()
      await page.keyboard.type('INT. TEST LOCATION - DAY')

      // Content should appear
      await expect(editor).toContainText('INT. TEST LOCATION - DAY')
    })

    test('should show element toolbar', async ({ page }) => {
      // Look for element type buttons/toolbar
      const toolbar = page.locator('[class*="toolbar"]').first()
        .or(page.getByRole('toolbar'))
        .or(page.locator('button:has-text("Scene")').first())

      await expect(toolbar).toBeVisible({ timeout: 10000 })
    })

    test('Cmd+K should open command palette', async ({ page }) => {
      const editor = page.locator('.ProseMirror').first()
      await editor.click()

      // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      await page.keyboard.press('Meta+k')

      // Command palette should appear
      const palette = page.getByRole('dialog').or(page.locator('[class*="command"]'))
      await expect(palette).toBeVisible({ timeout: 5000 })
    })
  })
})
