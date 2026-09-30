const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  try {
      await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle2', timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));
      // Click the archive toggle
      await page.click('#archive-toggle-btn');
      await new Promise(r => setTimeout(r, 1000));
      // Click the first non-today day
      const days = await page.$$('.calendar-day:not(.empty-day):not(.active-selected)');
      if (days.length > 0) {
         await days[0].click();
         console.log("Clicked historical day.");
      } else {
         console.log("No historical days found.");
      }
      await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
      console.log("PUPPETEER ERROR:", e.message);
  }
  await browser.close();
})();
