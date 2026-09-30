const THREE = require('three');
global.THREE = THREE;
global.window = { innerWidth: 1000, innerHeight: 1000, devicePixelRatio: 1, addEventListener: ()=>{} };
global.document = { 
    createElement: (tag) => {
        if (tag === 'canvas') return { style: {}, getContext: () => ({ fillRect: ()=>{}, strokeRect: ()=>{}, fillText: ()=>{}, beginPath: ()=>{}, moveTo: ()=>{}, lineTo: ()=>{}, stroke: ()=>{}, fillStyle: '', strokeStyle: '', lineWidth: 0 }) };
        if (tag === 'button') return { style: {} };
        return { style: {} };
    },
    body: { appendChild: ()=>{} }
};
global.navigator = {};
global.fetch = () => new Promise(()=>{});

const fs = require('fs');
const js = fs.readFileSync('display/trace_vr.js', 'utf8');

// evaluate everything up to initWebXR execution
try {
    const script = js.replace(/import \*/g, '//');
    eval(script);
    initWebXR();
    console.log("initWebXR executed successfully without errors");
} catch(e) {
    console.log("ERROR in initWebXR:", e.message);
}
