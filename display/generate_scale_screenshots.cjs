const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // 1. The Full Tapestry (The Big Thing)
  await page.evaluate(() => {
    if (window.currentMode !== 'HISTORICAL') {
       window.currentMode = 'HISTORICAL';
       window.historicalDayNumber = 5;
    }
    if (window.renderScale !== 'MACRO') document.getElementById('scale-toggle-btn').click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'scale_3_tapestry.png' });
  
  // 2. The Macro Block (A single 12-second block)
  await page.screenshot({ 
      path: 'scale_2_macro_block.png', 
      clip: { x: 720, y: 450, width: 90, height: 90 } 
  });
  
  // 3. The Micro Block (Individual payments)
  await page.evaluate(() => {
    document.getElementById('scale-toggle-btn').click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ 
      path: 'scale_1_micro_block.png', 
      clip: { x: 720, y: 450, width: 90, height: 90 } 
  });

  await browser.close();
  console.log("Scale screenshots generated successfully.");
})();
