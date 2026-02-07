import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { HISTORY_PATH } from "../config.js";

interface HistoryEntry {
  action: "search" | "recall" | "learn";
  query?: string;
  planId?: string;
  txHash?: string;
  costXlm?: number;
  timestamp: string;
}

const MAX_ENTRIES = 1000;

export function appendHistory(
  entry: Omit<HistoryEntry, "timestamp">,
): void {
  mkdirSync(dirname(HISTORY_PATH), { recursive: true });

  let history: HistoryEntry[] = [];
  if (existsSync(HISTORY_PATH)) {
    try {
      history = JSON.parse(
        readFileSync(HISTORY_PATH, "utf-8"),
      ) as HistoryEntry[];
    } catch {
      history = [];
    }
  }

  history.push({ ...entry, timestamp: new Date().toISOString() });

  if (history.length > MAX_ENTRIES) {
    history = history.slice(-MAX_ENTRIES);
  }

  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

export function getHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(
      readFileSync(HISTORY_PATH, "utf-8"),
    ) as HistoryEntry[];
  } catch {
    return [];
  }
}
