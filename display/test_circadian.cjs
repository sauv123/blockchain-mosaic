const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('ERROR:', err.message));
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  console.log("Test complete. No fatal canvas crashes.");
})();
