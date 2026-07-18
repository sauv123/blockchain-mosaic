# The Blockchain Mosaic

A living, responsive digital art mosaic that transforms live Ethereum blockchain data into a beautiful, generative grid of tiles. Each tile represents a block, and its color, saturation, sub-pixel grid density, and accent styling reflect real-time blockchain activity (base fee, transaction count, smart contract ratio, and whale transactions).

## Features

- **Generative Tapestry**: Blocks translate into unique 8x8 deterministic visual patterns seeded from their block hash.
- **Visual Encoding**:
  - **Hue**: Fee level / Gas base fee (blue at low fees, red at high fees).
  - **Saturation**: Transaction count/congestion (vivid on busy blocks, muted on quiet blocks).
  - **Sub-Pixel Grid Complexity**: Smart contract calls vs. standard transfers.
  - **Accent Pixels**: Highlights blocks with unusually large transactions ("whale events").
- **Tiered Interaction**:
  - **Across the Room**: Ambient tapestry with slow opacity shimmer.
  - **Hover**: Plain English overview card.
  - **Click**: Complete block receipts and a link to verify on Etherscan.
- **Kiosk Ready**: Responsive canvas grid, auto-reconnecting WebSockets, auto-dismiss overlays, and support for hardware viewports.

---

## Getting Started

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org) (v18 or higher) installed.

### 2. Installation

1. Navigate to the project root and install dependencies for both components:
   ```bash
   # Install backend dependencies
   cd relay
   npm install

   # Install frontend server dependencies
   cd ../display
   npm install
   ```

2. Configure environment variables. A default `.env` is initialized in the project root:
   ```env
   ETHEREUM_RPC_URL=https://cloudflare-eth.com
   PORT=8080
   WHALE_THRESHOLD_USD=50000
   ```
   *Tip: Public nodes are rate-limited. For a reliable, production installation, substitute `ETHEREUM_RPC_URL` with a private key endpoint from Alchemy, Infura, or QuickNode.*

---

## Running the Application

To run the complete experience, you need to start both the **Backend Relay** and the **Frontend Web App**.

### 1. Start the Backend Relay
The relay handles fetching Ethereum blocks, parsing metadata, mapping variables to visual parameters, storing them in SQLite, and broadcasting to connected display screens.
```bash
cd relay
npm start
```

### 2. Start the Frontend Display Server
Serve the Canvas application locally:
```bash
cd display
npm start
```

Once started, open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Project Structure

```
├── .env                  # Configuration variables
├── .env.example
├── README.md
├── relay/
│   ├── index.js          # Core block ingestion & WebSocket broadcast
│   ├── db.js             # SQLite block store
│   └── package.json
└── display/
    ├── index.html        # Main viewport structure with popover card
    ├── style.css         # Dark theme, glassmorphism, popover transitions
    ├── app.js            # Canvas renderer & user interaction logic
    └── package.json
```
