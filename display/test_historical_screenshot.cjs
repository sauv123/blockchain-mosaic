const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  await page.goto('http://localhost:3001/trace-xr.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Open archive
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));

  // Click last day
  const days = await page.$$('.calendar-day:not(.empty-day)');
  if (days.length > 0) {
    await days[days.length - 2].click();
    await new Promise(r => setTimeout(r, 2000));
    
    // Click play
    const playBtn = await page.$('#playback-play-btn');
    if (playBtn) await playBtn.click();
    
    await new Promise(r => setTimeout(r, 3000)); // wait for some blocks to spawn
  }
  
  await page.screenshot({ path: 'xr-historical-screenshot.png' });
  
  await browser.close();
})();
