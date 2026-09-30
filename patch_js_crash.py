import re
with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the crashing assignments
js = js.replace("historicalDateLabel.textContent = `${formattedFriendlyDate} — ${categoryLabel}`;", "if (historicalDateLabel) historicalDateLabel.textContent = `${formattedFriendlyDate} — ${categoryLabel}`;")
js = js.replace("historicalBanner.classList.add('active');", "if (historicalBanner) historicalBanner.classList.add('active');")
js = js.replace("historicalBanner.classList.remove('active');", "if (historicalBanner) historicalBanner.classList.remove('active');")

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Crashing JS lines safely guarded")
