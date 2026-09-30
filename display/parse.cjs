const acorn = require('acorn');
const fs = require('fs');
try {
  acorn.parse(fs.readFileSync('app.js', 'utf8'), { ecmaVersion: 2020, sourceType: 'module' });
  console.log("No syntax errors");
} catch(e) {
  console.log(e.message, "at line", e.loc.line, "col", e.loc.column);
}
