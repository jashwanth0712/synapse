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
