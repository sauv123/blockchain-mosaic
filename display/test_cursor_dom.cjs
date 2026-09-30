const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const cursorInfo = await page.evaluate(() => {
    const el = document.getElementById('custom-cursor');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      rect: rect.toJSON(),
      opacity: style.opacity,
      display: style.display,
      visibility: style.visibility,
      transform: style.transform,
      zIndex: style.zIndex,
      mixBlendMode: style.mixBlendMode
    };
  });
  
  console.log('Cursor Info:', cursorInfo);
  await browser.close();
})();
