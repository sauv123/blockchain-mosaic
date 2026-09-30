import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """  // Calculate the human story text
  let totalTx = 0;
  let totalUsd = 0;
  if (typeof blocks !== 'undefined') {
      blocks.forEach(b => {
          if (b.transactions) {
              totalTx += b.transactions.length;
              totalUsd += b.transactions.reduce((sum, t) => sum + (t.valueUsd||0), 0);
          }
      });
  }"""

repl = """  // Calculate the human story text
  let totalTx = 0;
  let totalUsd = 0;
  if (typeof blocks !== 'undefined') {
      blocks.forEach(b => {
          if (b.transactions) {
              totalTx += b.transactions.length;
              totalUsd += b.transactions.reduce((sum, t) => sum + (t.valueUsd||0), 0);
          } else if (b.tx_count) {
              // Fallback for simulated blocks
              totalTx += b.tx_count;
              // rough estimation for simulated blocks
              totalUsd += (b.tx_count * 45) + (b.largest_tx_value_usd || 0);
          }
      });
  }"""

js = js.replace(target, repl)

# Also fix the fallback notification text
target2 = """                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : 0;
                  const txCount = newBlock.transactions ? newBlock.transactions.length : 0;"""

repl2 = """                  const val = newBlock.transactions ? newBlock.transactions.reduce((acc, t) => acc + (t.valueUsd||0), 0) : ((newBlock.tx_count||0) * 45 + (newBlock.largest_tx_value_usd || 0));
                  const txCount = newBlock.transactions ? newBlock.transactions.length : (newBlock.tx_count || 0);"""

js = js.replace(target2, repl2)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed Billboard and Notifications for Simulated Blocks!")
