const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = "function loadHistoricalDay(day) {";
const hijack = `function loadHistoricalDay(day) {
  // HIJACKED FOR ART SYNTHESIS
  triggerArtisticSynthesis(day);
  return;
`;

js = js.replace(target, hijack);
fs.writeFileSync('mosaic.js', js);
console.log("Historical day hijacked.");
