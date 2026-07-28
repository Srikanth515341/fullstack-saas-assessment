import { test, expect } from '@playwright/test';

function uniqueEmail() {
  return `e2e-tasks-${Date.now()}@example.com`;
}

async function signUp(page: import('@playwright/test').Page) {
  const email = uniqueEmail();
  await page.goto('/sign-up');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'e2e-test-password-123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test('create a task, see it in the list, then toggle it complete', async ({ page }) => {
  await signUp(page);

  const title = `E2E task ${Date.now()}`;
  await page.goto('/dashboard/tasks');
  await page.fill('input[name="title"]', title);
  await page.getByRole('button', { name: /add task/i }).click();

  const taskRow = page.getByText(title, { exact: true });
  await expect(taskRow).toBeVisible();

  // Toggle it complete — the title gets a strikethrough style once
  // `completed` flips, driven by the same class the toggle server action
  // updates.
  await page.getByLabel('Toggle task completion').first().click();
  await expect(taskRow).toHaveClass(/line-through/);
});

test('deleting a task moves it to the trash, where it can be restored', async ({ page }) => {
  await signUp(page);

  const title = `E2E trash test ${Date.now()}`;
  await page.goto('/dashboard/tasks');
  await page.fill('input[name="title"]', title);
  await page.getByRole('button', { name: /add task/i }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.getByLabel('Delete task').first().click();
  await expect(page.getByText(title, { exact: true })).not.toBeVisible();

  await page.goto('/dashboard/tasks/trash');
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /restore/i }).first().click();
  await expect(page.getByText(title, { exact: true })).not.toBeVisible();

  await page.goto('/dashboard/tasks');
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});
