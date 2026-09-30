import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = "if (window.xrParticles && typeof theme !== 'undefined' && theme.accent) {"
repl = """if (window.xrParticles && typeof THEMES !== 'undefined' && typeof currentTheme !== 'undefined') {
        const globalTheme = THEMES[currentTheme];
        if (globalTheme && globalTheme.accent) {
            const theme = globalTheme;"""

js = js.replace(target, repl)

# and we need an extra closing brace
target2 = """            }
            window.xrParticles.geometry.attributes.color.needsUpdate = true;
        }
    }
    if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {"""

repl2 = """            }
            window.xrParticles.geometry.attributes.color.needsUpdate = true;
        }
      }
    }
    if (typeof xrRenderer !== 'undefined' && xrRenderer.xr.isPresenting) {"""

js = js.replace(target2, repl2)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed theme variable scope!")
