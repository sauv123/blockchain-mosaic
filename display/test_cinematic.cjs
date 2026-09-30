const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // move mouse to corner to trigger subtle tilt
  await page.mouse.move(50, 50);
  await new Promise(r => setTimeout(r, 500));
  
  await page.screenshot({ path: 'cinematic_dashboard.png' });
  await browser.close();
})();
