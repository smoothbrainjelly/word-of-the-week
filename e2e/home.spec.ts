import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("is behind authentication", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Sign in");
  });
});
