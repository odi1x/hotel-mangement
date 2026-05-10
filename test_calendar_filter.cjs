const { chromium } = require('playwright');

async function testCalendarFilter() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Login
  const hasLogin = await page.locator('input[type="text"]').count() > 0;
  if (hasLogin) {
      await page.fill('input[type="text"]', 'demo');
      await page.fill('input[type="password"]', 'demo123');
      await page.click('button[type="submit"]');
  }

  await page.waitForTimeout(3000);

  // Navigate to Availability View if not there
  await page.click('text=التوفر');

  // Wait for calendar cells to render
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: 'calendar-filter-check.png', fullPage: true });

  await browser.close();
  console.log("Screenshot taken.");
}

testCalendarFilter();
