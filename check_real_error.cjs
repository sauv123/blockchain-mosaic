const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', e => {
      console.log('UNCAUGHT_ERR:', e.message, e.filename, e.lineno);
    });
    window.addEventListener('unhandledrejection', e => {
      console.log('PROMISE_ERR:', e.reason);
    });
  });

  await page.goto('http://localhost:3000/quest.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
