import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadOrCreateWallet, getBalance, fundWithFriendbot } from "../wallet/manager.js";
import { LocalStorageProvider } from "../storage/local-provider.js";
import { appendHistory } from "../history/tracker.js";
import { submitPayment } from "../payments/stellar.js";
import {
  DB_PATH,
  PLATFORM_ADDRESS,
  SEARCH_COST_XLM,
  RECALL_COST_XLM,
  VALIDATION_ENABLED,
  SIMILARITY_CHECK_ENABLED,
  SIMILARITY_THRESHOLD,
  STORAGE_MODE,
  SOROBAN_RPC_URL,
  CONTRACT_ID,
  INDEXER_DB_PATH,
} from "../config.js";
import { validateContent } from "../validation/analyzer.js";
import { checkSemanticSimilarity } from "../validation/similarity.js";
import type { StorageProvider } from "../storage/provider.js";

async function createStorageProvider(keypair: ReturnType<typeof loadOrCreateWallet>): Promise<StorageProvider> {
  if (STORAGE_MODE === "soroban" || STORAGE_MODE === "dual") {
    if (!CONTRACT_ID) {
      console.error("[Synapse] SYNAPSE_CONTRACT_ID not set, falling back to local storage");
      return new LocalStorageProvider(DB_PATH);
    }

    const { PinataClient } = await import("../ipfs/client.js");
    const { SorobanEventIndexer } = await import("../indexer/event-listener.js");
    const { SorobanStorageProvider } = await import("../storage/soroban-provider.js");

    const ipfsClient = new PinataClient();
    const indexer = new SorobanEventIndexer(
      SOROBAN_RPC_URL,
      CONTRACT_ID,
      INDEXER_DB_PATH,
      ipfsClient,
    );
    indexer.start();

    return new SorobanStorageProvider(
      SOROBAN_RPC_URL,
      CONTRACT_ID,
      keypair,
      ipfsClient,
      indexer,
    );
  }

  return new LocalStorageProvider(DB_PATH);
}

export async function startMcpServer(): Promise<void> {
  const keypair = loadOrCreateWallet();
  const publicKey = keypair.publicKey();
  const storage = await createStorageProvider(keypair);

  // Auto-fund on testnet if new wallet
  try {
    const bal = await getBalance(publicKey);
    if (bal.includes("not funded")) {
      await fundWithFriendbot(publicKey);
    }
  } catch {
    // Non-fatal
  }

  const server = new McpServer({
    name: "synapse-mcp",
    version: "0.1.0",
  });

  // Tool: synapse_search (0.2 XLM)
  server.tool(
    "synapse_search",
    "Search the Synapse knowledge base for implementation plans, patterns, and solutions contributed by AI agents and developers. Returns ranked results using full-text search with BM25 scoring. Each search costs 0.2 XLM paid via Stellar testnet. Example: synapse_search({ query: 'kubernetes deployment', tags: ['k8s'] })",
    {
      query: z
        .string()
        .describe(
          "Search query (e.g., 'kubernetes deployment', 'auth flow')",
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags (e.g., ['k8s', 'auth'])"),
    },
    async ({ query, tags }) => {
      try {
        // Submit payment
        const payment = await submitPayment(
          keypair,
          PLATFORM_ADDRESS,
          SEARCH_COST_XLM,
        );

        if (!payment.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Payment failed: ${payment.error}\nEnsure your wallet is funded. Run: synapse-mcp fund`,
              },
            ],
            isError: true,
          };
        }

        const results = await storage.search({ query, tags });
        appendHistory({
          action: "search",
          query,
          txHash: payment.txHash || undefined,
          costXlm: 0.2,
        });

        const balance = await getBalance(publicKey).catch(() => "unknown");

        const text =
          results.length === 0
            ? `No plans found for "${query}".`
            : results
                .map(
                  (r, i) =>
                    `${i + 1}. **${r.title}** (id: ${r.id})\n   ${r.description}\n   Tags: ${r.tags.join(", ")} | Score: ${r.quality_score} | Purchases: ${r.purchase_count}`,
                )
                .join("\n\n");

        return {
          content: [
            { type: "text" as const, text },
            {
              type: "text" as const,
              text: `\nCost: ${SEARCH_COST_XLM} XLM | Tx: ${payment.txHash || "n/a"}\nWallet: ${publicKey} | Balance: ${balance}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Search error: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: synapse_recall (1 XLM)
  server.tool(
    "synapse_recall",
    "Retrieve the full content of a specific plan from the Synapse knowledge base. Use the plan ID from synapse_search results. Returns complete markdown content including implementation details, code examples, and architectural decisions. Each retrieval costs 1 XLM. Example: synapse_recall({ id: 'abc-123-def' })",
    {
      id: z
        .string()
        .describe("Plan ID (UUID from search results)"),
    },
    async ({ id }) => {
      try {
        const plan = await storage.getById(id);
        if (!plan) {
          return {
            content: [
              { type: "text" as const, text: `Plan not found: ${id}` },
            ],
            isError: true,
          };
        }

        // Submit payment
        const payment = await submitPayment(
          keypair,
          PLATFORM_ADDRESS,
          RECALL_COST_XLM,
        );

        if (!payment.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Payment failed: ${payment.error}\nEnsure your wallet is funded. Run: synapse-mcp fund`,
              },
            ],
            isError: true,
          };
        }

        // Record purchase
        await storage.recordPurchase(
          id,
          publicKey,
          10_000_000, // 1 XLM in stroops
          payment.txHash,
        );

        appendHistory({
          action: "recall",
          planId: id,
          txHash: payment.txHash || undefined,
          costXlm: 1,
        });

        const balance = await getBalance(publicKey).catch(() => "unknown");
        const tags = JSON.parse(plan.tags) as string[];

        const text = [
          `# ${plan.title}`,
          "",
          `**Domain**: ${plan.domain || "general"} | **Tags**: ${tags.join(", ")}`,
          `**Contributor**: ${plan.contributor_address}`,
          `**Content Hash**: ${plan.content_hash}`,
          "",
          plan.content,
        ].join("\n");

        return {
          content: [
            { type: "text" as const, text },
            {
              type: "text" as const,
              text: `\nCost: ${RECALL_COST_XLM} XLM | Tx: ${payment.txHash || "n/a"}\nWallet: ${publicKey} | Balance: ${balance}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Recall error: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: synapse_learn (free)
  server.tool(
    "synapse_learn",
    "Upload a new implementation plan to the Synapse knowledge base. Share your learnings, patterns, and solutions so other AI agents can benefit. Plans are content-addressed (SHA-256) to prevent duplicates. Contributors earn 70% of future retrieval fees when other agents access their plans. Example: synapse_learn({ title: 'Auth with NextAuth', content: '# Setup...', tags: ['auth', 'nextjs'] })",
    {
      title: z
        .string()
        .min(3)
        .max(200)
        .describe("Plan title"),
      content: z
        .string()
        .min(10)
        .describe("Full plan content (markdown)"),
      tags: z
        .array(z.string())
        .describe(
          "Tags for discoverability (e.g., ['auth', 'nextjs'])",
        ),
      domain: z
        .string()
        .optional()
        .describe("Domain (e.g., 'web', 'devops', 'ml')"),
      language: z
        .string()
        .optional()
        .describe("Programming language"),
      framework: z
        .string()
        .optional()
        .describe("Framework used"),
    },
    async ({ title, content, tags, domain, language, framework }) => {
      try {
        // AI content validation
        let qualityScore = 0;
        let validationWarning: string | undefined;

        if (VALIDATION_ENABLED) {
          const validation = await validateContent({ title, content, tags, domain });

          if (!validation.passed && !validation.skipped) {
            const feedback = [
              `Content validation failed (score: ${validation.score}/100, category: ${validation.category})`,
              "",
              ...(validation.issues.length > 0
                ? ["**Issues:**", ...validation.issues.map((i) => `- ${i}`), ""]
                : []),
              ...(validation.feedback ? [`**Feedback:** ${validation.feedback}`] : []),
            ].join("\n");

            return {
              content: [{ type: "text" as const, text: feedback }],
              isError: true,
            };
          }

          qualityScore = validation.score;
          if (validation.warning) {
            validationWarning = validation.warning;
          }
        }

        // Check for exact duplicate content (SHA-256)
        const exists = await storage.contentExists(content);
        if (exists) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Duplicate content - a plan with identical content already exists.",
              },
            ],
            isError: true,
          };
        }

        // Check for semantically similar content
        // Stage 1: BM25 pre-filter to find candidates
        // Stage 2: Claude CLI semantic comparison on candidates
        if (SIMILARITY_CHECK_ENABLED) {
          const searchQuery = `${title} ${tags.join(" ")}`;
          const bm25Results = await storage.search({ query: searchQuery, tags, limit: 5 });

          // Pre-filter: only send candidates with reasonable BM25 relevance to Claude
          const candidates = bm25Results.filter((r) => r.rank > SIMILARITY_THRESHOLD);

          if (candidates.length > 0) {
            // Fetch full content for each candidate
            const candidatesWithContent = await Promise.all(
              candidates.map(async (r) => {
                const full = await storage.getById(r.id);
                return full ? { id: r.id, title: r.title, content: full.content } : null;
              }),
            );
            const validCandidates = candidatesWithContent.filter(
              (c): c is NonNullable<typeof c> => c !== null,
            );

            if (validCandidates.length > 0) {
              const similarity = await checkSemanticSimilarity(title, content, validCandidates);

              if (similarity.hasDuplicate) {
                const matches = similarity.matches
                  .map(
                    (m) =>
                      `- **${m.title}** (id: ${m.id}, similarity: ${m.similarity}%)\n  ${m.explanation}`,
                  )
                  .join("\n");

                return {
                  content: [
                    {
                      type: "text" as const,
                      text: [
                        "Semantically similar content already exists in the knowledge base:",
                        "",
                        matches,
                        "",
                        "Your submission covers substantially the same ground as existing plans.",
                        "Use `synapse_recall` with the plan ID to review the existing content.",
                        "If your content adds significant new information, try narrowing the scope or focusing on what's different.",
                      ].join("\n"),
                    },
                  ],
                  isError: true,
                };
              }

              if (similarity.warning && !validationWarning) {
                validationWarning = similarity.warning;
              }
            }
          }
        }

        const plan = await storage.store({
          title,
          content,
          tags,
          domain,
          language,
          framework,
          contributor_address: publicKey,
          quality_score: qualityScore,
        });

        appendHistory({ action: "learn", planId: plan.id });

        const successLines = [
          "Plan stored successfully!",
          "",
          `ID: ${plan.id}`,
          `Title: ${plan.title}`,
          `Quality Score: ${qualityScore === -1 ? "unscored" : `${qualityScore}/100`}`,
          `Content Hash: ${plan.content_hash}`,
          `Contributor: ${publicKey}`,
          "",
          "Revenue: You earn 70% of future retrieval fees when other agents access this plan.",
        ];

        if (validationWarning) {
          successLines.push("", `Warning: ${validationWarning}`);
        }

        return {
          content: [
            { type: "text" as const, text: successLines.join("\n") },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Learn error: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
