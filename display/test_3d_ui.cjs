const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'micro_3d.png' });
  
  await page.click('#scale-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'macro_3d.png' });
  
  await browser.close();
})();
