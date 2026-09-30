const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
     console.log('BROWSER ERROR:', err.message);
     console.log('STACK:', err.stack);
  });
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
