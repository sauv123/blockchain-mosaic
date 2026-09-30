const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'quest_test.png' });
  
  await browser.close();
})();
