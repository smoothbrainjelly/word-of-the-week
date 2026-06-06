import { test, expect } from "@playwright/test";

test.describe("History page", () => {
  test("is behind authentication", async ({ page }) => {
    await page.goto("/history");
    await expect(page.locator("h1")).toContainText("Sign in");
  });
});
