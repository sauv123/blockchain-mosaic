const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'live_dashboard.png' });
  
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const days = document.querySelectorAll('.calendar-day');
    if (days.length > 12) days[12].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  
  await page.click('#generate-portrait-btn');
  await new Promise(r => setTimeout(r, 1500));
  
  await page.screenshot({ path: 'final_portrait.png' });
  await browser.close();
})();
