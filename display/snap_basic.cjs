const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'basic.png' });
  await browser.close();
})();
