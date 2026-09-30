const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal&palette=sunset', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Hover over a button to trigger magnetic pull and cursor expand
  const btn = await page.$('#settings-btn') || await page.$('#theme-toggle-btn');
  if (btn) {
    const box = await btn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await page.mouse.move(100, 50);
  }
  
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'micro_test.png' });
  await browser.close();
})();
