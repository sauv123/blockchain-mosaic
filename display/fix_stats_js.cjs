const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const jsOldStats = `  const massiveTx = document.getElementById('massive-tx');
  const massiveVol = document.getElementById('massive-vol');
  const massiveDirect = document.getElementById('massive-direct');
  if (massiveTx) massiveTx.textContent = txCount.toLocaleString();
  if (massiveVol) massiveVol.textContent = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
  if (massiveDirect) massiveDirect.textContent = directCount.toLocaleString();`;

const jsNewStats = `  const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (txCount > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > txCount * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = \`<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>\${directCount.toLocaleString()}</strong> human payments moved <strong>\${volStr}</strong>.<br>The network weather is \${weatherCondition}.</span>\`;
  }`;

if (js.includes('massive-tx')) {
    js = js.replace(jsOldStats, jsNewStats);
    fs.writeFileSync('mosaic.js', js);
    console.log("Stats JS fixed.");
} else {
    console.log("Stats logic not found.");
}
