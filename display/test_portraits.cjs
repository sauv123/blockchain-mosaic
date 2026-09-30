const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1000, height: 950 } });
  const page = await browser.newPage();
  
  // WAY A - Light
  await page.goto('http://localhost:3000/portraits.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'way_a_light.png' });
  
  // WAY C - Heavy
  await page.click('#btn-way-c');
  await page.select('#day-type', 'heavy');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'way_c_heavy.png' });
  
  await browser.close();
})();
