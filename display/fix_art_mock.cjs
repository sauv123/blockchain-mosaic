const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = "blocks = [];\\n  for (let i = 0; i < 200; i++) {\\n    blocks.push(generateMockBlock(i));\\n  }";
js = js.replace(/blocks = \[\];\n  for \(let i = 0; i < 200; i\+\+\) \{\n    blocks\.push\(generateMockBlock\(i\)\);\n  \}/g, "blocks = generateMockHistoryForDate('2026-09-14').slice(0, 1000);");

fs.writeFileSync('mosaic.js', js);
console.log("Mock blocks fixed.");
