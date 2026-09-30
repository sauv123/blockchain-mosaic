const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  const days = await page.$$('.calendar-day:not(.empty-day)');
  if (days.length > 0) {
      await days[days.length - 1].click();
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
