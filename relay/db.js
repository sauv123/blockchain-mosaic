import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'mosaic.db');

const db = new Database(dbPath);

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS blocks (
    block_number INTEGER PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    timestamp INTEGER NOT NULL,
    base_fee_gwei REAL NOT NULL,
    tx_count INTEGER NOT NULL,
    contract_ratio REAL NOT NULL,
    whale_flag INTEGER NOT NULL,
    largest_tx_value_usd REAL NOT NULL,
    hue INTEGER NOT NULL,
    saturation INTEGER NOT NULL,
    complexity REAL NOT NULL
  )
`);

export function getHistory(limit = 200) {
  const stmt = db.prepare(`
    SELECT * FROM blocks 
    ORDER BY block_number DESC 
    LIMIT ?
  `);
  // return history in ascending order so it populates grid left-to-right correctly
  return stmt.all(limit).reverse();
}

export function saveBlock(blockData) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO blocks (
      block_number, hash, timestamp, base_fee_gwei, tx_count, 
      contract_ratio, whale_flag, largest_tx_value_usd, hue, saturation, complexity
    ) VALUES (
      @block_number, @hash, @timestamp, @base_fee_gwei, @tx_count, 
      @contract_ratio, @whale_flag, @largest_tx_value_usd, @hue, @saturation, @complexity
    )
  `);
  stmt.run(blockData);
}

export function getBlocksForDate(dateString) {
  // Parse dateString (YYYY-MM-DD) into start and end UNIX timestamps (UTC)
  const startDate = new Date(dateString + 'T00:00:00Z');
  const endDate = new Date(dateString + 'T23:59:59Z');
  
  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);

  const stmt = db.prepare(`
    SELECT * FROM blocks 
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY block_number ASC
  `);
  return stmt.all(startUnix, endUnix);
}

export default db;
