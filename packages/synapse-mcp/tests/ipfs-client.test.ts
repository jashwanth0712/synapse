import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { PinataClient } = await import("../src/ipfs/client.js");

describe("PinataClient", () => {
  let client: InstanceType<typeof PinataClient>;

  beforeEach(() => {
    client = new PinataClient("test-key", "test-secret", "https://gw.test.com");
    mockFetch.mockReset();
  });

  describe("pin", () => {
    it("should pin content and return CID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ IpfsHash: "QmTestHash123", PinSize: 256 }),
      });

      const result = await client.pin("Hello IPFS");

      expect(result.cid).toBe("QmTestHash123");
      expect(result.size).toBe(256);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should throw on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(client.pin("test")).rejects.toThrow("Pinata pin failed (401)");
    });
  });

  describe("get", () => {
    it("should fetch content from IPFS gateway", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: "Plan content here" }),
      });

      const result = await client.get("QmTestHash123");

      expect(result).toBe("Plan content here");
      expect(mockFetch).toHaveBeenCalledWith("https://gw.test.com/ipfs/QmTestHash123");
    });

    it("should throw on fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(client.get("QmBadHash")).rejects.toThrow("IPFS get failed (404)");
    });
  });

  describe("unpin", () => {
    it("should unpin content", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await expect(client.unpin("QmTestHash123")).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.pinata.cloud/pinning/unpin/QmTestHash123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should not throw on 404", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(client.unpin("QmGone")).resolves.toBeUndefined();
    });
  });

  describe("isPinned", () => {
    it("should return true when content is pinned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      });

      const result = await client.isPinned("QmTestHash123");
      expect(result).toBe(true);
    });

    it("should return false when content is not pinned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      });

      const result = await client.isPinned("QmNotPinned");
      expect(result).toBe(false);
    });
  });
});
