import { test, expect } from "@playwright/test";

test.describe("Signup page", () => {
  test("renders sign-up form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText("Sign up");
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send magic link")')).toBeVisible();
  });

  test("has link to sign in", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("text=Already have an account?")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in" }).last()
    ).toBeVisible();
  });
});
