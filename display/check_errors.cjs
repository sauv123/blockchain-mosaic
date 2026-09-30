const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  
  // Try to click the toggle
  try {
    await page.click('#scale-toggle-btn');
    console.log("Clicked toggle button successfully.");
  } catch (e) {
    console.log("Failed to click toggle button:", e.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
