import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

export function initDatabase(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL UNIQUE,
      tags TEXT NOT NULL DEFAULT '[]',
      domain TEXT,
      language TEXT,
      framework TEXT,
      contributor_address TEXT NOT NULL,
      quality_score REAL NOT NULL DEFAULT 0,
      purchase_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS plans_fts USING fts5(
      title,
      description,
      tags,
      content,
      content=plans,
      content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS plans_ai AFTER INSERT ON plans BEGIN
      INSERT INTO plans_fts(rowid, title, description, tags, content)
      VALUES (new.rowid, new.title, new.description, new.tags, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS plans_ad AFTER DELETE ON plans BEGIN
      INSERT INTO plans_fts(plans_fts, rowid, title, description, tags, content)
      VALUES ('delete', old.rowid, old.title, old.description, old.tags, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS plans_au AFTER UPDATE ON plans BEGIN
      INSERT INTO plans_fts(plans_fts, rowid, title, description, tags, content)
      VALUES ('delete', old.rowid, old.title, old.description, old.tags, old.content);
      INSERT INTO plans_fts(rowid, title, description, tags, content)
      VALUES (new.rowid, new.title, new.description, new.tags, new.content);
    END;

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      buyer_address TEXT NOT NULL,
      amount_stroops INTEGER NOT NULL,
      contributor_share_stroops INTEGER NOT NULL,
      operator_share_stroops INTEGER NOT NULL,
      transaction_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_purchases_plan_id ON purchases(plan_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_address);
    CREATE INDEX IF NOT EXISTS idx_plans_contributor ON plans(contributor_address);
    CREATE INDEX IF NOT EXISTS idx_plans_content_hash ON plans(content_hash);
  `);

  return db;
}
