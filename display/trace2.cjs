const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  const count = await page.evaluate(() => document.querySelectorAll('.calendar-day').length);
  console.log("Calendar Days Count:", count);
  await browser.close();
})();
