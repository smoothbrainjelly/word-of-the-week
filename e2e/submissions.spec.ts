import { test, expect } from "@playwright/test";

test.describe("Submissions page", () => {
  test("is behind authentication", async ({ page }) => {
    await page.goto("/submissions");
    await expect(page.locator("h1")).toContainText("Sign in");
  });
});
