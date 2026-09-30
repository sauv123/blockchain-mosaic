const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:3001/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(async () => {
     try {
       await window.loadHistoricalPortrait('2026-07-15', 15);
       return document.querySelector('.playback-controls').className;
     } catch (err) {
       return "ERROR: " + err.stack;
     }
  });
  console.log("RESULT:", result);
  
  await browser.close();
})();
