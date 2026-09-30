const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 6000));
  await page.mouse.move(720, 450); // Hover center
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'final_ui.png' });
  await browser.close();
})();
