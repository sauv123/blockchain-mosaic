const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  
  // Wait for it to render
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'center_test.png' });
  await browser.close();
})();
