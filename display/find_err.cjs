const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');
try {
  new Function(js);
} catch (e) {
  console.log(e);
}
