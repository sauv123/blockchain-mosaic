const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Force click the 15th of July
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  const days = await page.$$('.calendar-day:not(.empty-day)');
  if (days.length > 0) {
      await days[days.length - 1].click(); // click the last available day
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Now click View Portrait
  await page.click('#generate-portrait-btn');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/Users/sauveersinha/.gemini/antigravity/brain/5788f408-a4db-4fe9-a857-7f718f495920/macro_test.png' });
  await browser.close();
})();
