const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
      await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle2', timeout: 5000 });
      await new Promise(r => setTimeout(r, 2000));
      
      console.log("--- Hovering over center of screen ---");
      await page.mouse.move(720, 450);
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("--- Toggling Abstract Portrait ---");
      await page.evaluate(() => {
          document.getElementById('scale-toggle-btn').click();
      });
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("--- Opening Archive & Clicking Historical Day ---");
      await page.click('#archive-toggle-btn');
      await new Promise(r => setTimeout(r, 1000));
      
      const days = await page.$$('.calendar-day:not(.empty-day):not(.active-selected)');
      if (days.length > 0) {
         await days[0].click();
      }
      await new Promise(r => setTimeout(r, 2000));
      
  } catch (e) {
      console.log("PUPPETEER EXCEPTION:", e.message);
  }
  
  await browser.close();
})();
