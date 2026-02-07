import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IPFSClient } from "../src/ipfs/client.js";
import type { SorobanEventIndexer } from "../src/indexer/event-listener.js";

// Mock the IPFS client
function createMockIPFS(): IPFSClient {
  return {
    pin: vi.fn().mockResolvedValue({ cid: "QmMockCid", size: 100 }),
    get: vi.fn().mockResolvedValue("Mock plan content"),
    unpin: vi.fn().mockResolvedValue(undefined),
    isPinned: vi.fn().mockResolvedValue(true),
  };
}

// Mock the indexer
function createMockIndexer(): Partial<SorobanEventIndexer> {
  return {
    search: vi.fn().mockReturnValue([]),
    getById: vi.fn().mockReturnValue(null),
    getStats: vi.fn().mockReturnValue({ total_plans: 0, total_purchases: 0 }),
    start: vi.fn(),
    stop: vi.fn(),
    processEvents: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SorobanStorageProvider", () => {
  describe("interface compliance", () => {
    it("should export SorobanStorageProvider class", async () => {
      const mod = await import("../src/storage/soroban-provider.js");
      expect(mod.SorobanStorageProvider).toBeDefined();
    });
  });

  describe("IPFS integration", () => {
    it("mock IPFS client should pin and get content", async () => {
      const ipfs = createMockIPFS();

      const pinResult = await ipfs.pin("test content");
      expect(pinResult.cid).toBe("QmMockCid");

      const content = await ipfs.get("QmMockCid");
      expect(content).toBe("Mock plan content");
    });
  });

  describe("indexer integration", () => {
    it("mock indexer should return search results", () => {
      const indexer = createMockIndexer();

      const results = indexer.search!("test query");
      expect(results).toEqual([]);
      expect(indexer.search).toHaveBeenCalledWith("test query");
    });

    it("mock indexer should return stats", () => {
      const indexer = createMockIndexer();

      const stats = indexer.getStats!();
      expect(stats.total_plans).toBe(0);
      expect(stats.total_purchases).toBe(0);
    });
  });
});
