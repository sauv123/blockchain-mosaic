const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const footerFix = `
/* FORCE FOOTER TO BOTTOM VISIBILITY */
body {
  overflow: hidden; /* Prevent scroll so footer isn't lost */
}

.app-footer {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 99999 !important;
  background: rgba(0, 0, 0, 0.2); /* Slight contrast to ensure it pops */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 12px 30px !important;
  display: flex !important;
  justify-content: space-between !important;
}

.canvas-container {
  height: calc(100vh - 180px) !important; /* Make room for header and footer explicitly */
  display: flex;
  align-items: center;
  justify-content: center;
}
`;

css += '\n' + footerFix;
fs.writeFileSync('style.css', css);
console.log("Footer fixed!");
