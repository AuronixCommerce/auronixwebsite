import { expect, test, type Page } from '@playwright/test';

async function openPage(page: Page, path: string) { await page.goto(path, { waitUntil: 'domcontentloaded' }); }
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('auronix-cookie-consent-v1', JSON.stringify({ essential: true, preferences: false, analytics: false, marketing: false, version: 1, updatedAt: Date.now() }))); });

test('newsletter unsubscribe supports email, code, reason, and success', async ({ page }) => {
  await page.route('**/api/newsletter/unsubscribe/request', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
  await page.route('**/api/newsletter/unsubscribe/confirm', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
  await openPage(page, '/newsletter/unsubscribe');
  await page.getByLabel('Subscribed email address').fill('reader@example.com'); await page.getByRole('button', { name: 'Email unsubscribe link' }).click();
  await expect(page.getByText('Unsubscribe email sent')).toBeVisible(); await page.getByLabel('Confirmation code').fill('123456'); await page.getByText('The content is not relevant to me').click(); await page.getByRole('button', { name: 'Confirm unsubscribe' }).click();
  await expect(page.getByRole('heading', { name: 'You’re unsubscribed' })).toBeVisible();
});

test('password reset provides enumeration-safe completion', async ({ page }) => {
  await page.route('**/api/auth/request-password-reset', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
  await openPage(page, '/forgot-password'); await page.getByLabel('Email address').fill('seller@example.com'); await page.getByRole('button', { name: 'Send Reset Link' }).click(); await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
});

test('seller application exposes five steps and a resumable secure dialog', async ({ page }) => {
  await openPage(page, '/seller/apply'); for (const step of ['WhatsApp', 'Email', 'Business', 'Profile', 'Review']) await expect(page.getByText(step, { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume saved application' }).click(); await expect(page.getByRole('dialog', { name: 'Continue your application' })).toBeVisible(); await expect(page.getByLabel('Private resume ID')).toBeVisible();
});

test('seller activation validates invitation and creates account through API', async ({ page }) => {
  await page.route('**/api/seller/activate', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
  await openPage(page, '/seller/activate?token=e2e-secure-token'); const passwords = page.locator('input[type="password"]'); await passwords.nth(0).fill('StrongPass123!'); await passwords.nth(1).fill('StrongPass123!'); await page.getByRole('button', { name: /Create Seller Account/i }).click(); await expect(page.getByRole('heading', { name: 'Account created' })).toBeVisible();
});

test('newsletter confirmation activates only through secure confirmation API', async ({ page }) => {
  await page.route('**/api/newsletter/confirm', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }));
  await openPage(page, '/newsletter/confirm?token=e2e-confirmation-token-that-is-long-enough-for-testing'); await expect(page.getByRole('heading', { name: 'Subscription confirmed' })).toBeVisible();
});

test('FAQ library is searchable and category sorted', async ({ page }) => {
  await openPage(page, '/faq');
  const countText = await page.getByText(/Showing \d+ answers/).textContent();
  expect(Number(countText?.match(/\d+/)?.[0] || 0)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Seller Dashboard', exact: true }).click();
  await expect(page.getByText('What can I access from the seller dashboard?')).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page
    .getByRole('searchbox', { name: 'Search frequently asked questions' })
    .fill('invitation link invalid');
  await expect(page.getByText('Why does my invitation link say invalid?')).toBeVisible();
});

test('Help Center opens dedicated technical seller guidance', async ({ page }) => {
  await openPage(page, '/help');
  await page.locator('a[href="/help/seller-dashboard-access"]').first().click();
  await expect(page).toHaveURL(/\/help\/seller-dashboard-access$/);
  await expect(page.getByRole('heading', { name: 'Troubleshoot seller dashboard access' })).toBeVisible();
  await expect(page.getByText('Restore access')).toBeVisible();
});

test('AI local memory creates one reload boundary and can be cleared', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('auronix-ai-local-memory-v1')) {
      localStorage.setItem('auronix-ai-local-memory-v1', JSON.stringify([
        { id: 'saved-question', role: 'user', content: 'Saved seller question' },
        { id: 'saved-answer', role: 'assistant', content: 'Saved seller answer', answerSource: 'found', responseSeconds: 1 },
      ]));
    }
  });

  await openPage(page, '/');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open Auronix AI chat' }).click();
  await expect(page.getByText('Saved seller answer')).toBeVisible();
  await expect(page.getByRole('separator', { name: 'Previous chat ended' })).toHaveCount(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open Auronix AI chat' }).click();
  await expect(page.getByRole('separator', { name: 'Previous chat ended' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear saved AI chat memory' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delete this chat history?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete chat history' }).click();
  await expect(page.getByRole('button', { name: 'Clearing chat…' })).toBeVisible();
  await expect(page.getByText('Saved seller answer')).toHaveCount(0);
  await expect(page.getByRole('separator', { name: 'Previous chat ended' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('auronix-ai-local-memory-v1'))).toBe('[]');
});
