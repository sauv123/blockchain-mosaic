import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add billboard stats update to the new live block generator
target1 = r"const newBlock = \{\s*block_number: bNum, timestamp: ts, hash: hsh, tx_count: txC,.*?dominant_type: 'Token Transfer'\s*\};\s*blocks\.push\(newBlock\);"
repl1 = """const newBlock = {
            block_number: bNum, timestamp: ts, hash: hsh, tx_count: txC,
            base_fee_gwei: bFee, contract_ratio: 0.5, whale_flag: wFlag,
            largest_tx_value_usd: vUsd, dominant_type: 'Token Transfer'
        };
        blocks.push(newBlock);
        window.lastBillboardStats = { txCount: txC, val: Math.round(vUsd) };
"""
js = re.sub(target1, repl1, js, flags=re.DOTALL)

# 2. Fix notification starting height
js = js.replace("notifMesh.position.set(0.0, -0.6, -2.0); // Start at floor", "notifMesh.position.set(0.0, 0.8, -2.0); // Start floating ABOVE the tile")

# 3. Move billboard much further right
target2 = r"window\.xrBillboard\.position\.set\(.*?\);\s*window\.xrBillboard\.rotation\.y = .*?;"
repl2 = """window.xrBillboard.position.set(12.0, 1.6, -1.0); // Moved significantly right to avoid panel overlap
  window.xrBillboard.lookAt(0, 1.6, 0);"""
js = re.sub(target2, repl2, js)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied final billboard stats, notification height, and billboard position!")
