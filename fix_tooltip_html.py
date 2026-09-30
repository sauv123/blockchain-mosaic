import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = r"hoverTooltip\.innerHTML = `.*?`;"
repl = """hoverTooltip.innerHTML = `
    <div style="font-family: 'Space Mono', monospace; font-size: 16px; line-height: 1.5; color: #fff; padding: 10px;">
      <div style="color: #00ff88; font-size: 12px; margin-bottom: 8px;">BLOCK #${block.block_number || block.id || 'LIVE'}</div>
      <div>PAYMENTS: <strong>${block.tx_count || 50}</strong></div>
      <div>MOVED: <strong>$${(typeof totalBlockUsd !== 'undefined' ? totalBlockUsd : 50000).toLocaleString()}</strong></div>
    </div>
  `;"""

js = re.sub(target, repl, js, flags=re.DOTALL)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed tooltip HTML!")
