const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Verify login success and wait for dashboard to load
  await page.waitForSelector('text="إجمالي الوحدات"', { timeout: 10000 });
  console.log('Login successful');

  // Navigate to Calendar
  await page.click('text="جدول التوفر"');
  await page.waitForTimeout(2000); // Give calendar time to render

  // We need to create some bookings on a specific date to see the "+X حجوزات" text
  // Since we don't have an API call here to seed data, we can take a screenshot
  // to make sure nothing is broken
  await page.screenshot({ path: path.join(__dirname, 'calendar_scroll_check.png'), fullPage: true });

  await browser.close();
})();
