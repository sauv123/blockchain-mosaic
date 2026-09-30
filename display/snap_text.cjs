const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  
  // Wait for some blocks to populate via websocket
  await new Promise(r => setTimeout(r, 4000));
  
  await page.screenshot({ path: 'text_preview.png' });
  await browser.close();
})();
