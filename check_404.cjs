const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });

  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
