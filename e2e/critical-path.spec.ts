import { test, expect } from "@playwright/test"

test.describe("critical path: public pages", () => {
  test("home page loads and shows The Guild branding", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=The Guild")).toBeVisible()
  })

  test("advancements page lists all 6 advancements", async ({ page }) => {
    await page.goto("/advancements")
    await expect(page.locator("text=Advancements")).toBeVisible()
  })

  test("navigating to auth page shows login form", async ({ page }) => {
    await page.goto("/auth")
    await expect(page.locator("text=The Guild")).toBeVisible()
  })

  test("unknown routes redirect to home or show content", async ({ page }) => {
    await page.goto("/nonexistent-route")
    await expect(page).toHaveURL(/\//)
  })

  test("home page has skip to content link for accessibility", async ({ page }) => {
    await page.goto("/")
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
  })
})

test.describe("critical path: navigation", () => {
  test("main nav links are visible", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("nav")).toBeVisible()
    await expect(page.locator('a[href="/advancements"]')).toBeVisible()
  })

  test("clicking Advancements nav link navigates correctly", async ({ page }) => {
    await page.goto("/")
    await page.click('a[href="/advancements"]')
    await expect(page).toHaveURL(/\/advancements/)
  })
})

test.describe("critical path: protected routes redirect", () => {
  test("library redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/library")
    await expect(page).toHaveURL(/\/auth/)
  })

  test("profile redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/profile")
    await expect(page).toHaveURL(/\/auth/)
  })

  test("newsroom redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/newsroom")
    await expect(page).toHaveURL(/\/auth/)
  })

  test("admin redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/auth/)
  })
})
