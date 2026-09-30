import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Completely remove the redundant showVRNotification block that declares txCount again
target = r"""                  const txCount = newBlock\.transactions \? newBlock\.transactions\.length : 0;
                  if \(newBlock\.whale_flag === 1\) \{
                      window\.showVRNotification\(`🚨 WHALE DETECTED: \$\$\{Math\.floor\(val\)\.toLocaleString\(\)\} 🚨`, true\);
                  \} else \{
                      window\.showVRNotification\(`NEW BLOCK: \$\{txCount\} TXs \| \$\$\{Math\.floor\(val\)\.toLocaleString\(\)\}`, false\);
                  \}"""

js = re.sub(target, "", js)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Removed duplicate txCount!")
