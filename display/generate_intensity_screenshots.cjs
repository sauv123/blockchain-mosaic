const puppeteer = require('puppeteer');

async function takeIntensityScreenshot(page, dayNum, filename) {
  // Navigate with the specific day parameter to trigger the generative shape algorithm
  // We'll just evaluate a script to force HISTORICAL mode and set the day
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate((day) => {
    // Force MACRO scale
    if (typeof renderScale !== 'undefined' && renderScale === 'MICRO') {
        document.getElementById('scale-toggle-btn').click();
    }
    // Force HISTORICAL mode
    if (typeof toggleMode !== 'undefined') {
       currentMode = 'HISTORICAL';
       historicalDayNumber = day;
       document.querySelector('.mosaic-story-banner').style.display = 'block';
    }
  }, dayNum);
  
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: filename });
  console.log(`Saved ${filename}`);
}

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  
  const pageHeavy = await browser.newPage();
  await takeIntensityScreenshot(pageHeavy, 3, 'intensity_heavy.png');
  await pageHeavy.close();
  
  const pageMod = await browser.newPage();
  await takeIntensityScreenshot(pageMod, 1, 'intensity_moderate.png');
  await pageMod.close();
  
  const pageLight = await browser.newPage();
  await takeIntensityScreenshot(pageLight, 2, 'intensity_light.png');
  await pageLight.close();

  await browser.close();
  console.log("Intensity screenshots generated successfully.");
})();
