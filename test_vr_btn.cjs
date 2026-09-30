const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle0' });
  const btn = await page.evaluate(() => {
    const b = document.getElementById('VRButton');
    return b ? b.textContent : 'NOT_FOUND';
  });
  console.log('Button says:', btn);
  await browser.close();
})();
