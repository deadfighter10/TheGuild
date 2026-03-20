import { test, expect } from "@playwright/test"

test.describe("admin flow: access control", () => {
  test("admin page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/auth/)
  })

  test("admin page is not accessible via direct navigation without auth", async ({ page }) => {
    const response = await page.goto("/admin")
    // Should redirect to auth, not show admin content
    await expect(page).toHaveURL(/\/auth/)
    expect(response?.status()).toBeLessThan(400)
  })
})

test.describe("admin flow: page structure", () => {
  test("public user profiles are not accessible without auth", async ({ page }) => {
    await page.goto("/users/some-uid")
    await expect(page).toHaveURL(/\/auth/)
  })
})
