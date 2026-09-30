import re

with open('display/vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

# The regex matches from physicalBlock.position.set(...) up to the end of the gsap.to for physicalBlock.scale
pattern = r'physicalBlock\.position\.set\(.*?\);\s*xrScene\.add\(physicalBlock\);\s*gsap\.to\(physicalBlock\.position, \{.*?\n\s*\}\);\s*gsap\.to\(physicalBlock\.scale, \{.*?\n\s*\}\);'

repl = """physicalBlock.position.set(0, -3.0, -4.5); // Rise from center floor
                      xrScene.add(physicalBlock);
                      
                      window.xrActiveBlocks.push({
                          mesh: physicalBlock,
                          targetY: 1.8,
                          targetZ: -4.8,
                          progress: 0
                      });"""

# Because the regex might fail on multiline, I'll use DOTALL
pattern = r'physicalBlock\.position\.set\(.*?\);\s*xrScene\.add\(physicalBlock\);\s*gsap\.to\(physicalBlock\.position, \{.*?\}\);\s*gsap\.to\(physicalBlock\.scale, \{.*?\}\);'

# Instead of complex regex, let's just do it manually. I know they look like this:
js = re.sub(
    r'physicalBlock\.position\.set.*?\}\);',
    r'physicalBlock.position.set(0, -3.0, -4.5);\n                      xrScene.add(physicalBlock);\n                      window.xrActiveBlocks.push({mesh: physicalBlock, targetY: 1.8, targetZ: -4.8, progress: 0});',
    js,
    flags=re.DOTALL
)

with open('display/vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Ripped out remaining GSAP!")
