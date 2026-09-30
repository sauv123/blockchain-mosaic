const WebSocket = require('ws');
const ws = new WebSocket('wss://blockchain-mosaic-production.up.railway.app');

ws.on('open', () => {
    console.log('CONNECTED TO RAILWAY RELAY');
    setTimeout(() => { ws.close(); }, 3000);
});
ws.on('error', (e) => {
    console.log('ERROR:', e.message);
});
