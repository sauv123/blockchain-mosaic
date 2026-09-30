const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 6000));
  
  // Hover over the middle block to test the hover tooltip
  await page.mouse.move(720, 450);
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'current_ui.png' });
  
  await browser.close();
})();
