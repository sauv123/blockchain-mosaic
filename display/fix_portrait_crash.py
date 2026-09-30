import sys

with open('mosaic.js', 'r') as f:
    js = f.read()

target = """function getBlockTransactions(block) {
  const hash = block.hash.replace('0x', '');"""
new = """function getBlockTransactions(block) {
  if (block.transactions) return block.transactions;
  const hash = (block.hash || "0x000").replace('0x', '');"""

if target in js:
    js = js.replace(target, new)
    print("Fixed getBlockTransactions crash.")
else:
    print("Not found.")

with open('mosaic.js', 'w') as f:
    f.write(js)
