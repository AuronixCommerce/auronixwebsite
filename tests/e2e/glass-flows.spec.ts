import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auronix-cookie-consent-v1', JSON.stringify({ essential: true, preferences: false, analytics: false, marketing: false, version: 1, updatedAt: Date.now() })));
});

test('seller completes all five steps without a WhatsApp request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/api/seller/draft', async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, draftId: 'test-draft', resumeId: 'AX-12345678', verified: body.action === 'email-verify' } });
  });
  let submission: any;
  await page.route('**/api/seller/apply', async route => {
    submission = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, applicationId: 'test-application' } });
  });
  await page.goto('/seller/apply');
  await page.getByRole('textbox', { name: 'Phone', exact: true }).fill('+1 555 123 4567');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full Name', exact: true }).fill('Test Seller');
  await page.getByRole('textbox', { name: 'Business Email', exact: true }).fill('seller@example.com');
  await page.getByRole('radio', { name: /Verify business email/ }).check();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Send Email Code' }).click();
  await page.getByLabel('Email verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify Email', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Business Name', exact: true }).fill('Test Wholesale');
  await page.getByRole('combobox', { name: 'Business Type', exact: true }).selectOption('Wholesaler');
  await page.getByRole('textbox', { name: 'Product Categories', exact: true }).fill('Home and kitchen');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  for (const [label, value] of Object.entries({ Country: 'United States', 'Street Address': '123 Test Street', City: 'Miami', 'State / Province': 'Florida', 'ZIP / Postal Code': '33101', 'Business Information': 'We supply authorized home and kitchen products to retail partners.', 'Why do you want to work with Auronix?': 'We want to expand our authorized retail distribution.' })) {
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Save & Review' }).click();
  await page.getByRole('radio', { name: /Yes, I agree/ }).check();
  await page.getByRole('checkbox', { name: /I agree to be contacted/ }).check();
  await page.getByRole('button', { name: 'Submit Verified Application' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for applying.' })).toBeVisible();
  expect(submission.draftId).toBe('test-draft');
  expect(JSON.stringify(submission)).not.toMatch(/whatsapp|verificationId/i);
  expect(requests.filter(url => /whatsapp/i.test(url))).toEqual([]);
});

test('supplier submits required information without verification', async ({ page }) => {
  let submission: any;
  await page.route('**/api/supplier/apply', async route => {
    submission = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true, submissionId: 'test-supplier' } });
  });
  await page.goto('/become-a-supplier');
  for (const [label, value] of Object.entries({ 'Company Name': 'Test Wholesale', 'Contact Name': 'Test Supplier', 'Business Email': 'supplier@example.com', Phone: '+1 555 123 4567', 'Product Categories': 'Home and kitchen' })) {
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('checkbox', { name: /I agree to be contacted/ }).check();
  await page.getByRole('button', { name: /Submit/ }).click();
  await expect(page.getByRole('heading', { name: 'Submission received.' })).toBeVisible();
  expect(submission.consent).toBe(true);
  expect(JSON.stringify(submission)).not.toMatch(/whatsapp|verificationId/i);
});

test('public routes preserve metadata and fit the viewport', async ({ page }) => {
  for (const path of ['/', '/about', '/our-process', '/contact', '/become-a-supplier', '/seller/apply', '/seller/login', '/admin/login', '/faq', '/help', '/privacy', '/terms']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveTitle(/Auronix/i);
    expect(await page.locator('link[rel="canonical"]').count(), path).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
  }
  await page.goto('/help/whatsapp-verification');
  await expect(page).toHaveURL(/\/help\/email-verification$/);
});

test('compact mobile, tablet and desktop navigation remain usable', async ({ page }, testInfo) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Search Auronix', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Search Auronix', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    if (width >= 768) await expect(page.locator('.ac-header')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (width < 768) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.getByRole('button', { name: 'Close navigation' })).toBeVisible();
      await page.getByRole('button', { name: 'Close navigation' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    for (const path of ['/seller/apply', '/become-a-supplier', '/admin/login', '/seller/login']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} at ${width}`).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll('/', '-')}-${width}.png`), fullPage: true });
    }
  }
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/seller/dashboard');
  await expect(page).toHaveURL(/\/seller\/login/);
});
