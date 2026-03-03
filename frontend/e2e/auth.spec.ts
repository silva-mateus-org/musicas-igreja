import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('unauthenticated user should see login modal on dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('dialog').or(page.getByText('Entrar'))).toBeVisible({ timeout: 10_000 })
  })

  test('music page should require authentication', async ({ page }) => {
    await page.goto('/music')
    await expect(page.getByRole('dialog').or(page.getByText('Entrar'))).toBeVisible({ timeout: 10_000 })
  })

  test('lists page should require authentication', async ({ page }) => {
    await page.goto('/lists')
    await expect(page.getByRole('dialog').or(page.getByText('Entrar'))).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Navigation', () => {
  test('root should redirect or show content', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(500)
  })
})
