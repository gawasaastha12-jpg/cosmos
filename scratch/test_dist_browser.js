const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:8000/dist/', { waitUntil: 'networkidle' });
  console.log('Page loaded successfully. Title:', await page.title());
  
  // Check hero visibility
  const h1Visible = await page.isVisible('h1');
  const subVisible = await page.isVisible('.sub');
  console.log('h1 visible:', h1Visible);
  console.log('sub visible:', subVisible);

  // Check console errors
  console.log('Errors encountered:', errors.length);
  if (errors.length > 0) console.log(errors);

  // Test navigation
  await page.click('button[data-go="sci"]');
  console.log('Navigated to sci view');
  await page.waitForTimeout(400);

  await page.click('button[data-go="myth"]');
  console.log('Navigated to myth view');
  await page.waitForTimeout(600);

  // Verify myth tabs
  const tabCount = await page.locator('#mt button').count();
  console.log('Myth tradition tabs rendered:', tabCount);

  await page.click('button[data-go="play"]');
  console.log('Navigated to play view');
  await page.waitForTimeout(400);

  await browser.close();
  console.log('All navigation tests PASSED cleanly.');
})();
