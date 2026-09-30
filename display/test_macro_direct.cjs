const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Force it via JS!
  await page.evaluate(() => {
     window.renderScale = 'MACRO';
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/Users/sauveersinha/.gemini/antigravity/brain/5788f408-a4db-4fe9-a857-7f718f495920/macro_direct_test.png' });
  await browser.close();
})();
