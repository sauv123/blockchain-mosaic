const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  
  // click enter focus mode
  await page.evaluate(() => {
    document.getElementById('art-mode-btn').click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // move mouse to corner to trigger tilt
  await page.mouse.move(100, 100);
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'focus_mode_test.png' });
  await browser.close();
})();
