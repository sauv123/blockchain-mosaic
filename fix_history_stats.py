import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"blocks = liveBlocks;\s+updateStats\(\);"
repl = """blocks = liveBlocks;
              updateStats();
              
              if (liveBlocks.length > 0) {
                  const lastB = liveBlocks[liveBlocks.length - 1];
                  const val = lastB.transactions ? lastB.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : ((lastB.tx_count||0) * 45 + (lastB.largest_tx_value_usd || 0));
                  const txCount = lastB.transactions ? lastB.transactions.length : (lastB.tx_count || 0);
                  window.lastBillboardStats = { txCount, val: Math.round(val) };
              }"""
js = re.sub(target, repl, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed history stats prepopulation!")
