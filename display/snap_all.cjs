const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'dashboard_weather.png' });
  
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    document.querySelectorAll('.calendar-day')[12].click(); // Day 14
  });
  await new Promise(r => setTimeout(r, 1500));
  
  // Click Generate Portrait
  await page.click('#generate-portrait-btn');
  await new Promise(r => setTimeout(r, 1500));
  
  await page.screenshot({ path: 'portrait_algorithm.png' });
  await browser.close();
})();
