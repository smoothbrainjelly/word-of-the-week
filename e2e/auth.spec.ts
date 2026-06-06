import { test, expect } from "@playwright/test";

test.describe("Auth-protected pages", () => {
  const protectedRoutes = ["/", "/history", "/preview"];

  for (const route of protectedRoutes) {
    test(`redirects unauthenticated users from ${route} to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("h1")).toContainText("Sign in");
    });
  }
});
