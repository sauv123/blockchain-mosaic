import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const bridgeIp = process.env.APUTURE_BRIDGE_IP || '192.168.1.150'; // Default fallback IP

// Payload triggers a dramatic flashing sequence across your 4 Aputure MC lights!
const alertPayload = {
  lights: [
    { id: 1, h: 190, s: 100, l: 100 }, // Light 1: Brilliant Cyan
    { id: 2, h: 320, s: 100, l: 100 }, // Light 2: Hot Magenta
    { id: 3, h: 35,  s: 100, l: 100 }, // Light 3: Neon Orange
    { id: 4, h: 0,   s: 0,   l: 100 }  // Light 4: Bright White Strobe
  ]
};

async function testLights() {
  console.log(`[Aputure Manual Trigger] Sending color flash commands to http://${bridgeIp}/api/v1/effects...`);
  try {
    const res = await fetch(`http://${bridgeIp}/api/v1/effects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload),
      timeout: 3000
    });
    console.log(`[Aputure Manual Trigger] Response Status: ${res.status}`);
    
    // Auto settle back down to moderate glow after 1.5 seconds
    setTimeout(async () => {
      console.log(`[Aputure Manual Trigger] Settling lights back to base ambient glow...`);
      const settlePayload = {
        lights: [
          { id: 1, h: 190, s: 100, l: 20 },
          { id: 2, h: 320, s: 100, l: 15 },
          { id: 3, h: 35,  s: 100, l: 10 },
          { id: 4, h: 0,   s: 0,   l: 5 }
        ]
      };
      await fetch(`http://${bridgeIp}/api/v1/effects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlePayload)
      });
      console.log(`[Aputure Manual Trigger] Settle commands sent successfully.`);
    }, 1500);

  } catch (err) {
    console.error(`[Aputure Manual Trigger] Failed to reach bridge:`, err.message);
    console.log('\n[Tip] Please verify that your computer is on the same Wi-Fi network as the Sidus Link Bridge, and check the APUTURE_BRIDGE_IP variable inside your project\'s .env file.');
  }
}

testLights();
