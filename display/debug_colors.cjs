const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/mosaic.html', { waitUntil: 'networkidle2', timeout: 5000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to read PALETTES
  const testColor = await page.evaluate(() => {
     try {
       const counts = {'Plain Transfer': 0, 'Token Swap': 0, 'NFT Mint': 0, 'Contract Creation': 0, 'Staking': 0};
       counts['Plain Transfer'] = 10;
       const domCat = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
       return { domCat, color: PALETTES[currentPalette][domCat] };
     } catch(e) {
       return e.message;
     }
  });
  console.log("Color test result:", testColor);
  
  await browser.close();
})();
