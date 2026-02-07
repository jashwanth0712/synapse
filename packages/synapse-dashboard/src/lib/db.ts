import Database from "better-sqlite3";
import { config } from "./config";
import { existsSync } from "fs";

let kbDb: Database.Database | null = null;
let indexerDb: Database.Database | null = null;

export function getKbDb(): Database.Database | null {
  if (kbDb) return kbDb;
  if (!existsSync(config.kbDbPath)) return null;
  kbDb = new Database(config.kbDbPath, { readonly: true });
  kbDb.pragma("journal_mode = WAL");
  return kbDb;
}

export function getIndexerDb(): Database.Database | null {
  if (indexerDb) return indexerDb;
  if (!existsSync(config.indexerDbPath)) return null;
  indexerDb = new Database(config.indexerDbPath, { readonly: true });
  indexerDb.pragma("journal_mode = WAL");
  return indexerDb;
}
