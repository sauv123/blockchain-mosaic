with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make the circadian gradients much stronger so the user can easily see the difference
js = js.replace("'rgba(40, 60, 90, 0.1)'", "'rgba(60, 100, 200, 0.25)'") # Morning blue
js = js.replace("'rgba(255, 120, 50, 0.08)'", "'rgba(255, 80, 0, 0.25)'")  # Evening amber
js = js.replace("alpha *= 0.65;", "alpha *= 0.40;") # Make night MUCH darker
js = js.replace("alpha *= 1.1;", "alpha *= 1.3;") # Make morning brighter

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Intensified circadian engine.")
