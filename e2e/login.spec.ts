import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign in");
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send magic link")')).toBeVisible();
  });

  test("has link to sign up", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Don't have an account?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("dev login button may be present", async ({ page }) => {
    await page.goto("/login");
    const btn = page.locator('button:has-text("Dev login")');
    const count = await btn.count();
    expect(count === 0 || count === 1).toBe(true);
  });
});
