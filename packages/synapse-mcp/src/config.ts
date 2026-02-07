import { join } from "path";
import { homedir } from "os";

const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const xdgData = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");

export const CONFIG_DIR =
  process.env.SYNAPSE_CONFIG_DIR || join(xdgConfig, "synapse-mcp");

export const DATA_DIR =
  process.env.SYNAPSE_DATA_DIR || join(xdgData, "synapse-mcp");

export const DB_PATH = join(DATA_DIR, "kb.db");
export const WALLET_PATH = join(CONFIG_DIR, "wallet.json");
export const HISTORY_PATH = join(DATA_DIR, "history.json");

export const NETWORK = "stellar-testnet";

// Hardcoded Synapse platform address (testnet)
export const PLATFORM_ADDRESS =
  process.env.SYNAPSE_PLATFORM_ADDRESS ||
  "GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT";

export const SEARCH_COST_XLM = "0.2";
export const RECALL_COST_XLM = "1";

// Content validation settings
export const VALIDATION_ENABLED = process.env.SYNAPSE_VALIDATION_ENABLED !== "false";
export const VALIDATION_TIMEOUT_MS = parseInt(process.env.SYNAPSE_VALIDATION_TIMEOUT || "60000", 10);
export const VALIDATION_PASS_THRESHOLD = parseInt(process.env.SYNAPSE_VALIDATION_THRESHOLD || "60", 10);

// Semantic deduplication settings
// BM25 scores are negative (closer to 0 = more relevant). Threshold for "too similar".
export const SIMILARITY_CHECK_ENABLED = process.env.SYNAPSE_SIMILARITY_CHECK !== "false";
export const SIMILARITY_THRESHOLD = parseFloat(process.env.SYNAPSE_SIMILARITY_THRESHOLD || "-5");

// Soroban on-chain storage settings
export const SOROBAN_RPC_URL =
  process.env.SYNAPSE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = process.env.SYNAPSE_CONTRACT_ID || "";
export const STORAGE_MODE: "local" | "soroban" | "dual" =
  (process.env.SYNAPSE_STORAGE_MODE as "local" | "soroban" | "dual") || "local";

// IPFS / Pinata settings
export const IPFS_API_KEY = process.env.SYNAPSE_IPFS_API_KEY || "";
export const IPFS_API_SECRET = process.env.SYNAPSE_IPFS_API_SECRET || "";
export const IPFS_GATEWAY =
  process.env.SYNAPSE_IPFS_GATEWAY || "https://gateway.pinata.cloud";

// Indexer database path (separate from main KB database)
export const INDEXER_DB_PATH = join(DATA_DIR, "indexer.db");
