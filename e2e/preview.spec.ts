import { test, expect } from "@playwright/test";

test.describe("Preview page", () => {
  test("is behind authentication", async ({ page }) => {
    await page.goto("/preview");
    await expect(page.locator("h1")).toContainText("Sign in");
  });
});
