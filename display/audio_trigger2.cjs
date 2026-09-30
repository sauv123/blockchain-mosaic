const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

js = js.replace(/blocks\.push\(newBlock\);/g, "blocks.push(newBlock); if (typeof audio !== 'undefined' && currentMode !== 'ART_SYNTHESIS') audio.playBlockTones(newBlock);");

fs.writeFileSync('mosaic.js', js);
console.log("Audio trigger injected.");
