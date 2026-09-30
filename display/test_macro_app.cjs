const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  
  // Wait 16s for the mock fallback to generate blocks if relay is down
  await new Promise(r => setTimeout(r, 16000));
  
  await page.click('#scale-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'macro_app.png' });
  await browser.close();
})();
