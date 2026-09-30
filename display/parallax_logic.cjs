const fs = require('fs');
let js = fs.readFileSync('mosaic.js', 'utf8');

const target = "playbackSlider.addEventListener('input', (e) => {";
const parallaxLogic = `
    // Parallax Time-Scrubbing Effect
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.style.transition = 'transform 0.1s ease-out, filter 0.1s ease-out';
      // Slight 3D scale and tilt backwards as you drag to simulate moving fast
      canvasContainer.style.transform = 'perspective(1000px) rotateX(2deg) scale(0.95) translateZ(-50px)';
      canvasContainer.style.filter = 'blur(1px)';
      
      // Reset after dragging stops
      clearTimeout(window.parallaxScrubTimer);
      window.parallaxScrubTimer = setTimeout(() => {
        canvasContainer.style.transform = 'perspective(1000px) rotateX(0deg) scale(1) translateZ(0)';
        canvasContainer.style.filter = 'blur(0)';
      }, 150);
    }
`;

js = js.replace(target, target + '\n' + parallaxLogic);

fs.writeFileSync('mosaic.js', js);
console.log("Parallax time-scrubbing injected.");
