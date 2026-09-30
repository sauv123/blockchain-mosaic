const WebSocket = require('ws');
const ws = new WebSocket('wss://ethereum-rpc.publicnode.com');

ws.on('open', () => {
    console.log('CONNECTED TO PUBLIC ETH NODE');
    ws.send(JSON.stringify({
        "jsonrpc":"2.0",
        "id": 1,
        "method": "eth_subscribe",
        "params": ["newHeads"]
    }));
});

ws.on('message', (data) => {
    console.log('MESSAGE:', data.toString());
});

ws.on('error', (e) => {
    console.log('ERROR:', e.message);
});

setTimeout(() => { ws.close(); }, 5000);
