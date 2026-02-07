import { join } from "path";
import { homedir } from "os";

// Match the same XDG paths used by synapse-mcp
const xdgData = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const dataDir = process.env.SYNAPSE_DATA_DIR || join(xdgData, "synapse-mcp");

export const config = {
  kbDbPath: process.env.SYNAPSE_KB_DB || join(dataDir, "kb.db"),
  indexerDbPath: process.env.SYNAPSE_INDEXER_DB || join(dataDir, "indexer.db"),
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
  contractId: process.env.SYNAPSE_CONTRACT_ID || "CAWHVSCOXZLHOY2AI2V5FYDCUKDFGDVH7MIWLELJDXRE432QZEZ2PCZI",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
  horizonUrl: process.env.HORIZON_URL || "https://horizon-testnet.stellar.org",
};
