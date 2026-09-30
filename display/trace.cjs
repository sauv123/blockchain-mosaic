const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('ERROR:', err.stack));
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await browser.close();
})();
