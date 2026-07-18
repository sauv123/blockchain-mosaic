import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com';

async function test() {
  console.log(`Testing connection to: ${RPC_URL}`);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Success! Current block number: ${blockNumber}`);
    
    console.log('Fetching details for the latest block...');
    const block = await provider.getBlock(blockNumber);
    console.log(`Block hash: ${block.hash}`);
    console.log(`Block timestamp: ${block.timestamp} (${new Date(block.timestamp * 1000).toLocaleString()})`);
    console.log(`Transactions count: ${block.transactions.length}`);
    if (block.baseFeePerGas) {
      console.log(`Base fee: ${ethers.formatUnits(block.baseFeePerGas, 'gwei')} Gwei`);
    } else {
      console.log('Base fee: None (legacy or unsupported)');
    }
  } catch (err) {
    console.error('Failed to query RPC provider:', err);
    process.exit(1);
  }
}

test();
