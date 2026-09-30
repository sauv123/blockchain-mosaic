const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.mouse.move(500, 500);
  await new Promise(r => setTimeout(r, 200));
  
  const cursorInfo = await page.evaluate(() => {
    const el = document.getElementById('custom-cursor');
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      rect: el.getBoundingClientRect().toJSON(),
      transform: style.transform
    };
  });
  
  console.log('Cursor Info After Move:', cursorInfo);
  await browser.close();
})();
