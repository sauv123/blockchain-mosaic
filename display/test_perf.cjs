const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  await page.tracing.start({path: 'trace.json'});
  await page.goto('http://localhost:3000/mosaic.html?theme=charcoal', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.mouse.move(100, 100);
  await new Promise(r => setTimeout(r, 100));
  await page.mouse.move(200, 200);
  await new Promise(r => setTimeout(r, 100));
  
  await page.tracing.stop();
  await browser.close();
  console.log("Performance trace saved.");
})();
