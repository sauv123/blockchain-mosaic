import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace my injected fetch code variables to avoid conflicts with the rest of the function
target = """const blockNum = parseInt(b.number, 16);
        const txCount = b.transactions.length;
        // Estimate ETH value based on gas and average transfer
        const estimatedValue = txCount * 4500; // rough USD average
        
        const newBlock = {
            block_number: blockNum,
            timestamp: parseInt(b.timestamp, 16),
            hash: b.hash,
            tx_count: txCount,"""

repl = """const rpcBlockNum = parseInt(b.number, 16);
        const rpcTxCount = b.transactions.length;
        const estimatedValue = rpcTxCount * 4500;
        
        const newBlock = {
            block_number: rpcBlockNum,
            timestamp: parseInt(b.timestamp, 16),
            hash: b.hash,
            tx_count: rpcTxCount,"""

js = js.replace(target, repl)

# Also fix whale_flag: txCount > 250 -> rpcTxCount > 250
js = js.replace("whale_flag: txCount > 250 ? 1 : 0,", "whale_flag: rpcTxCount > 250 ? 1 : 0,")

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed syntax error!")
