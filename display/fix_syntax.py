with open('mosaic.js', 'r') as f:
    js = f.read()

target = """    const volStr = totalUsd > 1000000 ? '

  if (blocks.length === 0) return;"""

new_target = """    const volStr = totalUsd > 1000000 ? '$' + (totalUsd / 1000000).toFixed(1) + 'M' : '$' + totalUsd.toLocaleString();
    weatherLine.innerHTML = `<span style="color: #000; text-shadow: none; font-weight: 500; font-size: 24px; padding: 20px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block;">Today, <strong>${directCount.toLocaleString()}</strong> human payments moved <strong>${volStr}</strong>.<br>The network weather is ${weatherCondition}.</span>`;
  }

  if (blocks.length === 0) return;"""

js = js.replace(target, new_target)

with open('mosaic.js', 'w') as f:
    f.write(js)
print("Syntax fixed")
