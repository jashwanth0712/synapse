import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalStorageProvider } from "../src/storage/local-provider.js";
import { join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";

let storage: LocalStorageProvider;
let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "synapse-test-"));
  storage = new LocalStorageProvider(join(tempDir, "test.db"));
});

afterEach(async () => {
  await storage.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("LocalStorageProvider", () => {
  it("should store and retrieve a plan", async () => {
    const plan = await storage.store({
      title: "Test Plan",
      content: "# Test\nThis is a test plan with enough content.",
      tags: ["test", "vitest"],
      domain: "testing",
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    expect(plan.id).toBeDefined();
    expect(plan.title).toBe("Test Plan");
    expect(plan.content_hash).toBeDefined();

    const retrieved = await storage.getById(plan.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe("Test Plan");
    expect(retrieved!.content).toContain("test plan");
  });

  it("should auto-generate description from content", async () => {
    const plan = await storage.store({
      title: "No Description",
      content: "This is the content that should become the description automatically.",
      tags: ["auto"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    expect(plan.description).toBe(
      "This is the content that should become the description automatically.",
    );
  });

  it("should detect duplicate content", async () => {
    const content = "Unique content for duplicate detection test.";

    await storage.store({
      title: "First",
      content,
      tags: ["dup"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    const exists = await storage.contentExists(content);
    expect(exists).toBe(true);

    const notExists = await storage.contentExists("Different content entirely.");
    expect(notExists).toBe(false);
  });

  it("should search plans with FTS", async () => {
    await storage.store({
      title: "Kubernetes Deployment Guide",
      content: "Deploy apps to kubernetes using helm charts and kubectl.",
      tags: ["k8s", "devops"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    await storage.store({
      title: "React Auth Flow",
      content: "Implement authentication using NextAuth with OAuth providers.",
      tags: ["auth", "react"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    const results = await storage.search({ query: "kubernetes" });
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Kubernetes Deployment Guide");

    const authResults = await storage.search({ query: "authentication" });
    expect(authResults.length).toBe(1);
    expect(authResults[0].title).toBe("React Auth Flow");
  });

  it("should filter by tags", async () => {
    await storage.store({
      title: "Plan A",
      content: "Content for plan A about web development.",
      tags: ["web", "react"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    await storage.store({
      title: "Plan B",
      content: "Content for plan B about devops tooling.",
      tags: ["devops", "docker"],
      contributor_address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV",
    });

    const results = await storage.search({ query: "", tags: ["react"] });
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Plan A");
  });

  it("should record purchases and track stats", async () => {
    const plan = await storage.store({
      title: "Purchased Plan",
      content: "Content worth paying for in a knowledge marketplace.",
      tags: ["premium"],
      contributor_address: "GCONTRIBUTOR",
    });

    const purchase = await storage.recordPurchase(
      plan.id,
      "GBUYER",
      10_000_000,
      "txhash123",
    );

    expect(purchase.amount_stroops).toBe(10_000_000);
    expect(purchase.contributor_share_stroops).toBe(7_000_000);
    expect(purchase.operator_share_stroops).toBe(3_000_000);

    const stats = await storage.getContributorStats("GCONTRIBUTOR");
    expect(stats.plans_count).toBe(1);
    expect(stats.total_purchases).toBe(1);
    expect(stats.total_earned_stroops).toBe(7_000_000);
  });

  it("should get KB stats", async () => {
    await storage.store({
      title: "Stats Plan",
      content: "Content for stats testing in synapse knowledge base.",
      tags: ["stats", "test"],
      contributor_address: "GSTATS",
    });

    const stats = await storage.getKBStats();
    expect(stats.total_plans).toBe(1);
    expect(stats.total_contributors).toBe(1);
    expect(stats.top_tags.length).toBe(2);
  });

  it("should get content hash", async () => {
    const plan = await storage.store({
      title: "Hash Plan",
      content: "Content for hash verification test.",
      tags: ["hash"],
      contributor_address: "GHASH",
    });

    const hash = await storage.getContentHash(plan.id);
    expect(hash).toBe(plan.content_hash);
    expect(hash.length).toBe(64); // SHA-256 hex
  });

  it("should throw on oracle methods", async () => {
    await expect(storage.publishToChain("fake")).rejects.toThrow("Soroban");
    await expect(storage.verifyIntegrity("fake")).rejects.toThrow("Soroban");
    await expect(storage.syncFromChain("fake")).rejects.toThrow("Soroban");
    await expect(storage.getOnChainMeta("fake")).rejects.toThrow("Soroban");
  });

  it("should get plan metadata", async () => {
    const plan = await storage.store({
      title: "Meta Plan",
      content: "Content for metadata retrieval test.",
      tags: ["meta", "test"],
      domain: "testing",
      contributor_address: "GMETA",
    });

    const meta = await storage.getMeta(plan.id);
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe("Meta Plan");
    expect(meta!.tags).toEqual(["meta", "test"]);
    expect(meta!.domain).toBe("testing");
    // Meta should not include content
    expect((meta as Record<string, unknown>).content).toBeUndefined();
  });
});
