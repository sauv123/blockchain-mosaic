const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Opening archive...");
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  const days = await page.$$('.calendar-day:not(.empty-day)');
  console.log(`Found ${days.length} days`);
  
  for(let i = days.length - 1; i >= Math.max(0, days.length - 3); i--) {
      console.log(`Clicking day index ${i}...`);
      await days[i].click();
      await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log("Clicking View Portrait...");
  await page.click('#generate-portrait-btn');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
