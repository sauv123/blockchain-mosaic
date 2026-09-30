with open('display/mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

circadian_funcs = """
// === CIRCADIAN UI ENGINE (Time of Day) ===
function getCircadianState() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 21) return 'EVENING';
  return 'NIGHT';
}

function applyCircadianAmbientLayer(ctx, width, height, state) {
  if (currentTheme !== 'charcoal') return;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (state === 'MORNING') {
    grad.addColorStop(0, 'rgba(40, 60, 90, 0.1)'); // Soft dawn blue
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'AFTERNOON') {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)'); // Neutral
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (state === 'EVENING') {
    grad.addColorStop(0, 'rgba(255, 120, 50, 0.08)'); // Sunset amber glow
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)'); // Deep shadow
    grad.addColorStop(1, 'rgba(5, 5, 15, 0.4)'); // Void
  }

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

"""

if "function getCircadianState()" not in js:
    # Inject it right after the imports/global variables
    js = js.replace("let renderScale = 'MICRO';", "let renderScale = 'MICRO';\n" + circadian_funcs)

with open('display/mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Injected circadian functions successfully.")
