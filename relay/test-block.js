import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com';

async function test() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    const num = await provider.getBlockNumber();
    const block = await provider.getBlock(num, true);
    console.log('Block fields:', Object.keys(block));
    console.log('Type of transactions array:', typeof block.transactions[0]);
    console.log('Sample transaction keys:', Object.keys(block.transactions[0] || {}));
    console.log('Is prefetchedTransactions present?', !!block.prefetchedTransactions);
  } catch (err) {
    console.error(err);
  }
}

test();
