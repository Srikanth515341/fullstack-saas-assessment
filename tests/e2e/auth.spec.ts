import { test, expect } from '@playwright/test';

// Timestamp-based email so re-running the suite doesn't collide with a
// previous run's account — there's no test-DB reset step here, this runs
// against the same dev database used for manual testing.
function uniqueEmail() {
  return `e2e-${Date.now()}@example.com`;
}

test('sign-up redirects to the dashboard', async ({ page }) => {
  const email = uniqueEmail();

  await page.goto('/sign-up');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'e2e-test-password-123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/);
});

test('an existing account can sign back in after the session cookie is cleared', async ({
  page
}) => {
  const email = uniqueEmail();
  const password = 'e2e-test-password-123';

  await page.goto('/sign-up');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().clearCookies();

  await page.goto('/sign-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/);
});

test('rejects sign-in with the wrong password', async ({ page }) => {
  const email = uniqueEmail();

  await page.goto('/sign-up');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'correct-password-123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().clearCookies();

  await page.goto('/sign-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'wrong-password-123');
  await page.click('button[type="submit"]');

  // Scoped to the form specifically — the same message also appears in a
  // toast notification, and getByText() with no scope matches both.
  await expect(
    page.locator('form').getByText(/invalid email or password/i)
  ).toBeVisible();
});
