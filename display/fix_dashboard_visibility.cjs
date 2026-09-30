const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');
css = css.replace(/mix-blend-mode: overlay;/g, '/* mix-blend-mode: overlay; */');
css = css.replace(/opacity: 0.15;/g, 'opacity: 0.8;');
css = css.replace(/opacity: 0.05;/g, 'opacity: 0.2;');
css = css.replace(/z-index: 1;/g, 'z-index: 5;');
fs.writeFileSync('style.css', css);
console.log("Dashboard CSS fixed for visibility.");
