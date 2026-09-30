const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  try {
      await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle2', timeout: 5000 });
      await new Promise(r => setTimeout(r, 2000));
      console.log("Navigation successful.");
  } catch (e) {
      console.log("PUPPETEER ERROR:", e.message);
  }
  await browser.close();
})();
