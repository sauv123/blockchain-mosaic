import re

with open('display/trace_vr.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = """          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
  }
    }"""
    
repl = """          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
  }"""

js = js.replace(target, repl)

with open('display/trace_vr.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed bracket!")
