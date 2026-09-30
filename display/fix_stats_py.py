import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target_start = "const giantTxEl = document.getElementById('giant-tx-count');"
target_end = "giantPaymentsEl.textContent = totalPayments.toLocaleString();\n  }"

idx1 = js.find(target_start)
if idx1 == -1:
    print("Could not find start")
    sys.exit(1)
idx2 = js.find(target_end, idx1)
if idx2 == -1:
    print("Could not find end")
    sys.exit(1)

old_code = js[idx1:idx2 + len(target_end)]

new_code = """const weatherLine = document.getElementById('cinematic-weather-line');
  if (weatherLine) {
    let totalTx = 0;
    let totalUsd = 0;
    let directCount = 0;
    
    blocks.forEach(b => {
      totalTx += b.tx_count;
      const txs = getBlockTransactions(b);
      txs.forEach(t => {
        totalUsd += t.valueUsd;
        if (t.type === 'Plain Transfer') directCount++;
      });
    });

    let weatherCondition = "calm and quiet";
    if (totalUsd > 5000000) weatherCondition = "experiencing heavy financial turbulence";
    else if (totalTx > 500) weatherCondition = "highly congested and expensive";
    else if (directCount > totalTx * 0.5) weatherCondition = "dominated by everyday human activity";
    
    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = `<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>${directCount.toLocaleString()}</strong> human payments moved <strong>${volStr}</strong>.<br>The network weather is ${weatherCondition}.</span>`;
  }"""

js = js.replace(old_code, new_code)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Stats fixed via Python")
