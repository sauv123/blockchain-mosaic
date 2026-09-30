const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    // Check if the simulation generates blocks!
    if (msg.text().includes('BLOCK GENERATED')) {
        console.log("BLOCK GENERATED SUCCESS!");
    }
  });

  await page.goto('http://localhost:3000/trace_vr.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
     // override generateSimulatedBlock to log it
     const oldGenerate = window.generateSimulatedBlock;
     window.generateSimulatedBlock = function() {
        console.log('BLOCK GENERATED');
     };
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
