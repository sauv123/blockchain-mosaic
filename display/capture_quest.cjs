const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Save directly to the artifacts directory
  await page.screenshot({ path: '/Users/sauveersinha/.gemini/antigravity/brain/5788f408-a4db-4fe9-a857-7f718f495920/quest_preview.png' });
  
  await browser.close();
})();
