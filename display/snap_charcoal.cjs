const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'charcoal_theme.png' });
  
  // Open settings, verify theme select
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: 'charcoal_settings.png' });
  
  await browser.close();
})();
