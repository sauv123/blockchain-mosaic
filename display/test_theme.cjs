const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  const bodyClass = await page.evaluate(() => document.body.className);
  const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  const selectVal = await page.evaluate(() => document.getElementById('theme-select')?.value);
  console.log("Body class:", bodyClass);
  console.log("Computed background:", bgColor);
  console.log("Select value:", selectVal);
  await browser.close();
})();
