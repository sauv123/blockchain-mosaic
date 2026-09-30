const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Settings & Archive to open the drawer
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  // Click a calendar day
  await page.evaluate(() => {
    document.querySelectorAll('.calendar-day')[15].click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'art_synthesis.png' });
  await browser.close();
})();
