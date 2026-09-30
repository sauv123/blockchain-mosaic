const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('RUNTIME ERROR:', err.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle2' });
  
  // Wait 2 seconds to let webgl and websockets init
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
