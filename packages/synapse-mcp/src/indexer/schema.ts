import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

export function initIndexerDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS indexed_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      ipfs_cid TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      domain TEXT,
      language TEXT,
      framework TEXT,
      contributor_address TEXT NOT NULL,
      quality_score REAL NOT NULL DEFAULT 0,
      purchase_count INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'hot',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS indexed_plans_fts USING fts5(
      title,
      description,
      tags,
      content,
      content=indexed_plans,
      content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS indexed_plans_ai AFTER INSERT ON indexed_plans BEGIN
      INSERT INTO indexed_plans_fts(rowid, title, description, tags, content)
      VALUES (new.rowid, new.title, new.description, new.tags, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS indexed_plans_ad AFTER DELETE ON indexed_plans BEGIN
      INSERT INTO indexed_plans_fts(indexed_plans_fts, rowid, title, description, tags, content)
      VALUES ('delete', old.rowid, old.title, old.description, old.tags, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS indexed_plans_au AFTER UPDATE ON indexed_plans BEGIN
      INSERT INTO indexed_plans_fts(indexed_plans_fts, rowid, title, description, tags, content)
      VALUES ('delete', old.rowid, old.title, old.description, old.tags, old.content);
      INSERT INTO indexed_plans_fts(rowid, title, description, tags, content)
      VALUES (new.rowid, new.title, new.description, new.tags, new.content);
    END;

    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}
