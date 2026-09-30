const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/Users/sauveersinha/.gemini/antigravity/brain/5788f408-a4db-4fe9-a857-7f718f495920/current_view.png' });
  
  await browser.close();
  console.log("Screenshot saved.");
})();
