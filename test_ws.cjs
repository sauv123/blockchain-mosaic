const WebSocket = require('ws');
const ws = new WebSocket('wss://blockchain-mosaic-relay.onrender.com');

ws.on('open', () => {
    console.log('CONNECTED TO RELAY');
    setTimeout(() => { ws.close(); }, 3000);
});

ws.on('message', (data) => {
    console.log('MESSAGE:', data.toString().substring(0, 100));
});

ws.on('error', (e) => {
    console.log('ERROR:', e.message);
});
