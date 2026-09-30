const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    document.querySelectorAll('.calendar-day')[12].click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking Generate Portrait...");
  await page.evaluate(() => {
    document.getElementById('generate-portrait-btn').click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
