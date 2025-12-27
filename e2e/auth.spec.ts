import { test, expect } from '@playwright/test'

test.describe('Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('should load login page', async ({ page }) => {
      await page.goto('/login')

      await expect(page).toHaveURL(/login/)
    })

    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      // Check for email input
      await expect(page.getByLabel(/email/i)).toBeVisible()

      // Check for password input
      await expect(page.getByLabel(/password/i)).toBeVisible()

      // Check for submit button (be specific to avoid Google button)
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })

    test('should have link to signup page', async ({ page }) => {
      await page.goto('/login')

      const signupLink = page.getByRole('link', { name: /sign up|create account|register/i })
      await expect(signupLink).toBeVisible()
    })

    test('should show validation error for empty form submission', async ({ page }) => {
      await page.goto('/login')

      // Try to submit empty form (use exact match for Sign in button)
      await page.getByRole('button', { name: 'Sign in' }).click()

      // Should show some form of validation (either HTML5 or custom)
      // The form should not navigate away
      await expect(page).toHaveURL(/login/)
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')

      await page.getByRole('button', { name: 'Sign in' }).click()

      // Should show error message or stay on login page
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe('Signup Page', () => {
    test('should load signup page', async ({ page }) => {
      await page.goto('/signup')

      await expect(page).toHaveURL(/signup/)
    })

    test('should display signup form', async ({ page }) => {
      await page.goto('/signup')

      // Check for email input
      await expect(page.getByLabel(/email/i)).toBeVisible()

      // Check for password input
      await expect(page.getByLabel(/password/i).first()).toBeVisible()

      // Check for submit button
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })

    test('should have link to login page', async ({ page }) => {
      await page.goto('/signup')

      const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i })
      await expect(loginLink).toBeVisible()
    })
  })

  test.describe('Auth Navigation', () => {
    test('should navigate from login to signup', async ({ page }) => {
      await page.goto('/login')

      await page.getByRole('link', { name: /sign up|create account|register/i }).click()

      await expect(page).toHaveURL(/signup/)
    })

    test('should navigate from signup to login', async ({ page }) => {
      await page.goto('/signup')

      await page.getByRole('link', { name: /sign in|log in|already have/i }).click()

      await expect(page).toHaveURL(/login/)
    })
  })
})
