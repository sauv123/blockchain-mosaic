import express from 'express';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveBlock, getHistory, getBlocksForDate } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load dotenv from parent directory or local
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const DEFAULT_PORT = parseInt(process.env.PORT || '8080', 10);
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com';
const WHALE_THRESHOLD_USD = parseFloat(process.env.WHALE_THRESHOLD_USD || '50000');
let PORT = DEFAULT_PORT;

const app = express();

// Enable CORS for frontend requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rpc: ETHEREUM_RPC_URL });
});

// API to query historical blocks by date
app.get('/api/history/:date', (req, res) => {
  try {
    const { date } = req.params;
    const blocks = getBlocksForDate(date);
    res.json({ status: 'success', date, count: blocks.length, data: blocks });
  } catch (err) {
    console.error('Error fetching historical blocks:', err);
    res.status(500).json({ error: 'Failed to retrieve historical blocks' });
  }
});

function startServer() {
  return new Promise((resolve, reject) => {
    const tryListen = (port) => {
      const server = app.listen(port, () => {
        PORT = port;
        console.log(`Relay server HTTP listening on port ${PORT}`);
        resolve(server);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const nextPort = port + 1;
          console.warn(`Port ${port} is already in use. Retrying on port ${nextPort}...`);
          server.close();
          tryListen(nextPort);
        } else {
          reject(err);
        }
      });
    };

    tryListen(DEFAULT_PORT);
  });
}

let server;
let wss;

async function initializeServer() {
  server = await startServer();
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('Client connected to mosaic relay');

    // Send existing history immediately
    try {
      const history = getHistory(200);
      ws.send(JSON.stringify({ type: 'history', data: history }));
    } catch (err) {
      console.error('Error fetching block history:', err);
    }

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

initializeServer().catch((err) => {
  console.error('Failed to start relay server:', err);
  process.exit(1);
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wss?.clients || []) {
    if (client.readyState === 1) { // Open
      client.send(message);
    }
  }
}

// Global cached ETH Price in USD
let ethPrice = 3000;
async function updateEthPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await res.json();
    if (data && data.ethereum && data.ethereum.usd) {
      ethPrice = parseFloat(data.ethereum.usd);
      console.log(`Updated Ethereum price: $${ethPrice} USD`);
    }
  } catch (err) {
    console.warn('Failed to fetch Ethereum price, using fallback of $3000 USD:', err.message);
  }
}

// Visual Mapping Helpers
function calculateHue(baseFeeGwei) {
  // Map 10 - 100 Gwei to Hue 230 (Blue) -> 15 (Red)
  const minFee = 10;
  const maxFee = 100;
  const minHue = 230;
  const maxHue = 15;
  if (baseFeeGwei <= minFee) return minHue;
  if (baseFeeGwei >= maxFee) return maxHue;
  const ratio = (baseFeeGwei - minFee) / (maxFee - minFee);
  return Math.round(minHue + ratio * (maxHue - minHue));
}

function calculateSaturation(txCount) {
  // Map 0 - 300 transactions to Saturation 40% -> 100%
  const minTx = 0;
  const maxTx = 300;
  const minSat = 40;
  const maxSat = 100;
  if (txCount <= minTx) return minSat;
  if (txCount >= maxTx) return maxSat;
  const ratio = (txCount - minTx) / (maxTx - minTx);
  return Math.round(minSat + ratio * (maxSat - minSat));
}

// Main Ethereum block processing
async function processBlock(provider, blockNumber) {
  try {
    console.log(`Processing block: ${blockNumber}`);
    const block = await provider.getBlock(blockNumber, true);
    if (!block) return;

    const baseFeeGwei = block.baseFeePerGas 
      ? parseFloat(ethers.formatUnits(block.baseFeePerGas, 'gwei')) 
      : 15.0; // fallback default fee

    const txCount = block.transactions.length;
    let contractCalls = 0;
    let contractCreations = 0;
    let transfers = 0;
    let maxTxValueEth = 0;

    block.prefetchedTransactions.forEach(tx => {
      // Find max transaction value
      const valEth = parseFloat(ethers.formatEther(tx.value));
      if (valEth > maxTxValueEth) {
        maxTxValueEth = valEth;
      }

      // Classify transaction type
      if (!tx.to) {
        contractCreations++;
      } else if (tx.data === '0x' || !tx.data) {
        transfers++;
      } else {
        contractCalls++;
      }
    });

    const largestTxValueUsd = maxTxValueEth * ethPrice;
    const whaleFlag = largestTxValueUsd >= WHALE_THRESHOLD_USD ? 1 : 0;
    const contractRatio = txCount > 0 ? (contractCalls + contractCreations) / txCount : 0.0;

    // Visual mappings
    const hue = calculateHue(baseFeeGwei);
    const saturation = calculateSaturation(txCount);
    const complexity = contractRatio; // 0.0 to 1.0

    const blockRecord = {
      block_number: Number(block.number),
      hash: block.hash,
      timestamp: Number(block.timestamp),
      base_fee_gwei: parseFloat(baseFeeGwei.toFixed(2)),
      tx_count: txCount,
      contract_ratio: parseFloat(contractRatio.toFixed(3)),
      whale_flag: whaleFlag,
      largest_tx_value_usd: parseFloat(largestTxValueUsd.toFixed(2)),
      hue,
      saturation,
      complexity
    };

    saveBlock(blockRecord);
    console.log(`Saved block ${block.number}: Hue=${hue}, Sat=${saturation}%, Complexity=${complexity}, Whale=${whaleFlag}`);
    
    // Trigger Aputure MC 4-Light Travel Kit controls
    triggerAputureBridge(blockRecord);
    
    // Broadcast to clients
    broadcast({ type: 'block', data: blockRecord });
  } catch (err) {
    console.error(`Error processing block ${blockNumber}:`, err);
  }
}

// Aputure MC 4-Light Travel Kit Bridge Integration
// Fastest & easiest: Local HTTP API requests to the Sidus Link Bridge IP address
async function triggerAputureBridge(block) {
  const bridgeIp = process.env.APUTURE_BRIDGE_IP;
  if (!bridgeIp) {
    // If no bridge IP is configured, run in simulated demo logging mode
    console.log(`[Aputure Bridge Simulator] Triggering MC Lights for Block #${block.block_number}:
      - Light 1 (Transfers / base gas): Pulsing cyan HSL(190, 100, ${Math.min(100, 20 + block.base_fee_gwei)}%)
      - Light 2 (DeFi swaps): Flashing magenta HSL(320, 100, ${block.contract_ratio > 0.4 ? 100 : 20}%)
      - Light 3 (NFT mints): Flashing orange HSL(35, 100, ${block.tx_count > 150 ? 90 : 10}%)
      - Light 4 (Whale transaction / system alerts): Strobe alert HSL(0, 0, ${block.whale_flag === 1 ? 100 : 0}%)`);
    return;
  }

  try {
    // Mapped Light configurations (4 Aputure MCs)
    const lightsPayload = {
      lights: [
        {
          id: 1, // Light 1: Base Gas Pulse (Cyan HSL)
          h: 190,
          s: 100,
          l: Math.min(100, Math.round(20 + block.base_fee_gwei))
        },
        {
          id: 2, // Light 2: DeFi Swap Alert (Magenta HSL)
          h: 320,
          s: 100,
          l: block.contract_ratio > 0.4 ? 100 : 15
        },
        {
          id: 3, // Light 3: NFT Mint Activity (Orange HSL)
          h: 35,
          s: 100,
          l: block.tx_count > 150 ? 90 : 10
        },
        {
          id: 4, // Light 4: Whale/Tracked Wallet Alerts (Strobe White HSL)
          h: 0,
          s: 0,
          l: block.whale_flag === 1 ? 100 : 0
        }
      ]
    };

    const res = await fetch(`http://${bridgeIp}/api/v1/effects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lightsPayload)
    });
    console.log(`[Aputure Bridge] Light updates sent to http://${bridgeIp}/api/v1/effects: ${res.status}`);
  } catch (err) {
    console.warn(`[Aputure Bridge] Failed to send API commands to http://${bridgeIp}:`, err.message);
  }
}

// Start tracking blocks
async function startTracking() {
  await updateEthPrice();
  // Update ETH price every 10 minutes
  setInterval(updateEthPrice, 10 * 60 * 1000);

  console.log(`Connecting to Ethereum RPC: ${ETHEREUM_RPC_URL}`);
  const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);

  let lastProcessedBlock = null;

  async function pollLatestBlock() {
    try {
      const latestBlockNum = await provider.getBlockNumber();
      if (lastProcessedBlock === null) {
        lastProcessedBlock = latestBlockNum - 1; // start index
      }
      
      // Process any new blocks
      for (let num = lastProcessedBlock + 1; num <= latestBlockNum; num++) {
        await processBlock(provider, num);
        lastProcessedBlock = num;
      }
    } catch (err) {
      console.error('Error polling latest block:', err.message);
    }
  }

  // Poll for latest block every 10 seconds
  pollLatestBlock();
  setInterval(pollLatestBlock, 10000);
}

startTracking().catch(err => {
  console.error('Critical failure in relay server:', err);
});
