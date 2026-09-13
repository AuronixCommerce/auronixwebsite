import { expect, test } from '@playwright/test';

const form = { fullName: 'Test Seller', businessName: 'Test Wholesale', phone: '+15551234567', country: 'US', address: '123 Test Street', city: 'Miami', state: 'Florida', zipCode: '33101', website: '', businessType: 'Wholesaler', yearsInBusiness: '', productCategories: 'Home', businessInformation: 'We distribute authorized products to retail businesses.', whyWorkWithAuronix: 'We want to expand our authorized distribution.', catalogUrl: '' };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auronix-cookie-consent-v1', JSON.stringify({ essential: true, preferences: false, analytics: false, marketing: false, version: 1, updatedAt: Date.now() })));
  await page.route('**/api/maintenance/status?*', route => route.fulfill({ json: { success: true, global: { active: false }, page: { active: false } } }));
});

test('tracking verifies email, accepts corrections and prefills contact support', async ({ page }) => {
  let application = { trackingId: 'AX-T-123456789012345678901234', status: 'changes_requested', createdAt: Date.now(), updatedAt: Date.now(), reviewMessage: 'Please correct your address.', canEdit: true, form };
  let verified = false;
  await page.route('**/api/seller/application/track', async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'request-code') {
      expect(body.emailType).toBe('personal');
      expect(body.email).toBe('seller@example.com');
      return route.fulfill({ json: { success: true, challengeId: 'challenge', message: 'If the details match, check your email.' } });
    }
    if (body.action === 'verify-code') {
      if (body.code !== '123456') return route.fulfill({ status: 400, json: { error: 'Auronix Auth: The code is incorrect or expired.' } });
      verified = true;
      return route.fulfill({ json: { success: true, token: 'b'.repeat(64) } });
    }
    expect(verified).toBe(true);
    expect(body.token).toBe('b'.repeat(64));
    if (body.action === 'edit') application = { ...application, status: 'pending', reviewMessage: '', form: body.form };
    return route.fulfill({ json: { success: true, application, verifiedEmail: 'seller@example.com' } });
  });
  await page.goto('/seller/application/track');
  await expect(page.getByText('Test Seller', { exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tracking ID', exact: true }).fill(application.trackingId);
  await page.getByRole('combobox', { name: 'Email type' }).selectOption('personal');
  await page.getByRole('textbox', { name: 'Application email' }).fill('seller@example.com');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await page.getByRole('textbox', { name: 'Email verification code' }).fill('000000');
  await page.getByRole('button', { name: 'Verify & view application' }).click();
  await expect(page.getByRole('region', { name: 'Application tracking' }).getByRole('alert')).toContainText('incorrect or expired');
  await page.getByRole('textbox', { name: 'Email verification code' }).fill('123456');
  await page.getByRole('button', { name: 'Verify & view application' }).click();
  await expect(page.getByText('Please correct your address.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit application', exact: true }).click();
  await page.getByRole('textbox', { name: 'Street address', exact: true }).fill('456 Corrected Street');
  await page.getByRole('button', { name: 'Save corrections' }).click();
  await expect(page.getByRole('region', { name: 'Application tracking' }).getByRole('status')).toContainText('corrections were saved');
  expect(application.form.address).toBe('456 Corrected Street');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('link', { name: 'Contact support', exact: true }).click();
  await expect(page).toHaveURL(/\/contact\?from=application/);
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Test Seller');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('seller@example.com');
  await expect(page.locator('textarea')).toHaveValue(new RegExp(application.trackingId));
});

test('submitted resume ID leads to tracking without reopening the old form', async ({ page }) => {
  await page.route('**/api/seller/draft', route => route.fulfill({ json: { success: true, submitted: true, trackingId: 'AX-T-123456789012345678901234' } }));
  await page.goto('/seller/apply');
  await page.getByRole('button', { name: 'Resume saved application' }).click();
  await page.getByRole('textbox', { name: 'Private resume ID' }).fill('AX-12345678');
  await page.getByRole('button', { name: 'Resume application', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your application is in progress.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track your application' })).toHaveAttribute('href', /\/seller\/application\/track\?id=AX-T-/);
});

test('seller login presents Auronix Auth errors instead of provider errors', async ({ page }) => {
  await page.route('https://identitytoolkit.googleapis.com/**', route => route.fulfill({ status: 400, json: { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS', errors: [{ message: 'INVALID_LOGIN_CREDENTIALS', domain: 'global', reason: 'invalid' }] } } }));
  await page.goto('/seller/login');
  await page.locator('input[type="email"]').fill('seller@example.com');
  await page.locator('input[type="password"]').fill('IncorrectPassword123!');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/Auronix Auth: The email or password is incorrect/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Firebase');
});

test('application support handoff prefills the team request and AI composer', async ({ page }) => {
  const prefill = { name: 'Test Seller', email: 'seller@example.com', subject: 'Seller application AX-T-TEST', message: 'Please help with application AX-T-TEST.', expiresAt: Date.now() + 600000 };
  await page.addInitScript(value => {
    sessionStorage.setItem('auronix-application-contact', JSON.stringify(value));
    sessionStorage.setItem('auronix-application-ai', JSON.stringify(value));
  }, prefill);
  await page.goto('/support/contact?from=application');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Test Seller');
  await expect(page.getByRole('textbox', { name: 'Subject', exact: true })).toHaveValue(prefill.subject);
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(prefill.message);
  await page.goto('/support/chat?from=application');
  await expect(page.locator('textarea').first()).toHaveValue(prefill.message);
});

test('tracking fits compact mobile and tablet with private SEO metadata', async ({ page }, testInfo) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/seller/application/track');
    await expect(page.getByRole('heading', { name: 'Track your application', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.screenshot({ path: testInfo.outputPath(`tracking-${width}.png`), fullPage: true });
  }
});
