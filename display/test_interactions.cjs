const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  
  // Try to click the ledger
  const clicked = await page.evaluate(() => {
    const legend = document.getElementById('legend-container');
    if (!legend) return 'NO_LEGEND';
    const items = legend.querySelectorAll('.legend-item');
    if (items.length < 2) return 'NO_ITEMS';
    
    // Click the second item (Trading Coins)
    items[1].click();
    return 'CLICKED';
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Interaction Result:', clicked);
  console.log('Errors:', errors);
  
  await browser.close();
})();
