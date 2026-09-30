const puppeteer = require('puppeteer');

async function takeScreenshotForHour(page, hour, filename) {
  // Overwrite Date.getHours() in the browser to spoof the time
  await page.evaluateOnNewDocument((spoofHour) => {
    const originalGetHours = Date.prototype.getHours;
    Date.prototype.getHours = function() {
      return spoofHour;
    };
  }, hour);
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Ensure we are in MACRO mode for best visibility of lighting
  try {
    await page.evaluate(() => {
       if (typeof renderScale !== 'undefined' && renderScale === 'MICRO') {
           document.getElementById('scale-toggle-btn').click();
       }
    });
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}

  await page.screenshot({ path: filename });
  console.log(`Saved ${filename}`);
}

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  
  // 1. Morning (9 AM)
  const pageMorning = await browser.newPage();
  await takeScreenshotForHour(pageMorning, 9, 'tod_morning.png');
  await pageMorning.close();
  
  // 2. Afternoon (2 PM)
  const pageAfternoon = await browser.newPage();
  await takeScreenshotForHour(pageAfternoon, 14, 'tod_afternoon.png');
  await pageAfternoon.close();
  
  // 3. Evening (7 PM)
  const pageEvening = await browser.newPage();
  await takeScreenshotForHour(pageEvening, 19, 'tod_evening.png');
  await pageEvening.close();
  
  // 4. Night (2 AM)
  const pageNight = await browser.newPage();
  await takeScreenshotForHour(pageNight, 2, 'tod_night.png');
  await pageNight.close();

  await browser.close();
  console.log("All screenshots generated successfully.");
})();
