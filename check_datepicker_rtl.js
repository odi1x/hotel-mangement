import { syncPlaywright } from '/app/local-testing/sync_playwright.js';

function verifyDatepicker() {
  const browser = syncPlaywright.chromium.launch({ headless: true });
  const page = browser.newPage();

  // Set larger viewport to prevent mobile layout
  page.setViewportSize({ width: 1280, height: 800 });

  page.goto('http://localhost:5173');

  // Login
  page.fill('input[type="text"]', 'demo');
  page.fill('input[type="password"]', 'demo123');
  page.click('button[type="submit"]');

  // Wait for login
  page.waitForSelector('.lucide-home');

  // Open Book By Date modal
  page.click('text=البحث بالتاريخ');

  // Wait for modal to open
  page.waitForSelector('text=البحث عن الوحدات المتاحة');

  // Click the datepicker input
  page.click('input[placeholder="اختر فترة الحجز"]');

  // Wait for popover and take a screenshot
  page.waitForSelector('.bg-white.shadow-sm.rounded-lg'); // This targets the inner calendar container
  page.waitForTimeout(500); // Give it a moment to animate

  page.screenshot({ path: 'datepicker-rtl-check.png', fullPage: true });

  browser.close();
  console.log("Screenshot taken.");
}

verifyDatepicker();
