const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking archive...");
  await page.click('#archive-toggle-btn');
  await new Promise(r => setTimeout(r, 1000));

  const days = await page.$$('.calendar-day:not(.empty-day)');
  console.log(`Found ${days.length} days`);
  
  if (days.length > 0) {
    console.log("Clicking last day...");
    await days[days.length - 2].click();
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Clicking Play...");
  const playBtn = await page.$('#playback-play-btn');
  if (playBtn) {
     await playBtn.click();
     await new Promise(r => setTimeout(r, 2000));
  } else {
     console.log("NO PLAY BUTTON FOUND!");
  }

  await browser.close();
})();
