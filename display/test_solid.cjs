const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/solid_summary.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'solid_sunset.png' });
  
  await page.select('#palette-select', 'forest');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'solid_forest.png' });
  
  await browser.close();
})();
