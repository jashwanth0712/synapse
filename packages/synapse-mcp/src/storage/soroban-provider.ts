import * as StellarSdk from "@stellar/stellar-sdk";
const {
  Contract,
  Keypair,
  Networks,
  rpc: SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  xdr,
  Address,
} = StellarSdk;
import { createHash } from "crypto";

import type {
  Plan,
  PlanMeta,
  PlanSearchResult,
  Purchase,
  ContributorStats,
  KBStats,
  StorePlanInput,
} from "../types.js";
import type {
  StorageProvider,
  SearchOptions,
  StoreOptions,
} from "./provider.js";
import type { IPFSClient } from "../ipfs/client.js";
import type { SorobanEventIndexer } from "../indexer/event-listener.js";

export class SorobanStorageProvider implements StorageProvider {
  private rpcServer: SorobanRpc.Server;
  private contract: Contract;
  private keypair: Keypair;
  private ipfsClient: IPFSClient;
  private indexer: SorobanEventIndexer;
  private networkPassphrase: string;

  constructor(
    rpcUrl: string,
    contractId: string,
    keypair: Keypair,
    ipfsClient: IPFSClient,
    indexer: SorobanEventIndexer,
    networkPassphrase: string = Networks.TESTNET,
  ) {
    this.rpcServer = new SorobanRpc.Server(rpcUrl);
    this.contract = new Contract(contractId);
    this.keypair = keypair;
    this.ipfsClient = ipfsClient;
    this.indexer = indexer;
    this.networkPassphrase = networkPassphrase;
  }

  // === Core CRUD ===

  async store(plan: StorePlanInput, _options?: StoreOptions): Promise<Plan> {
    const description =
      plan.description ||
      plan.content.slice(0, 200).replace(/\n/g, " ").trim();

    // Pin content to IPFS
    const { cid } = await this.ipfsClient.pin(plan.content);

    // Generate plan ID (16 bytes)
    const idBytes = createHash("md5")
      .update(`${plan.title}-${Date.now()}-${Math.random()}`)
      .digest();
    const planId = idBytes.toString("hex");

    // SHA-256 content hash
    const contentHash = createHash("sha256")
      .update(plan.content)
      .digest("hex");

    // Invoke store_plan on Soroban with StorePlanInput struct
    const contributorAddress = new Address(plan.contributor_address);
    const idBytesN = Buffer.from(planId, "hex");
    const hashBytesN = Buffer.from(contentHash, "hex");

    const tags = plan.tags.map((t) =>
      nativeToScVal(t, { type: "string" }),
    );

    // Build StorePlanInput struct as an ScVal map (sorted by field name)
    const inputStruct = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("content_hash"),
        val: xdr.ScVal.scvBytes(hashBytesN),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("description"),
        val: nativeToScVal(description, { type: "string" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("domain"),
        val: nativeToScVal(plan.domain || "", { type: "string" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("framework"),
        val: nativeToScVal(plan.framework || "", { type: "string" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("id"),
        val: xdr.ScVal.scvBytes(idBytesN),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("ipfs_cid"),
        val: nativeToScVal(cid, { type: "string" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("language"),
        val: nativeToScVal(plan.language || "", { type: "string" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("quality_score"),
        val: nativeToScVal(plan.quality_score ?? 0, { type: "u32" }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("tags"),
        val: xdr.ScVal.scvVec(tags),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("title"),
        val: nativeToScVal(plan.title, { type: "string" }),
      }),
    ]);

    const op = this.contract.call(
      "store_plan",
      contributorAddress.toScVal(),
      inputStruct,
    );

    await this.submitTransaction(op);

    return {
      id: planId,
      title: plan.title,
      description,
      content: plan.content,
      content_hash: contentHash,
      tags: JSON.stringify(plan.tags),
      domain: plan.domain || null,
      language: plan.language || null,
      framework: plan.framework || null,
      contributor_address: plan.contributor_address,
      quality_score: plan.quality_score ?? 0,
      purchase_count: 0,
      created_at: new Date().toISOString(),
    };
  }

  async getById(id: string): Promise<Plan | null> {
    // Try on-chain first for metadata
    const meta = await this.getOnChainMeta(id);
    if (!meta) return null;

    // Get content from IPFS via indexer cache
    const indexed = this.indexer.getById(id);
    let content = indexed?.content || "";

    if (!content) {
      // Fallback: query on-chain for CID, then fetch from IPFS
      try {
        const planMeta = await this.queryPlan(id);
        if (planMeta?.ipfsCid) {
          content = await this.ipfsClient.get(planMeta.ipfsCid);
        }
      } catch {
        // Content unavailable
      }
    }

    return {
      id: meta.id,
      title: meta.title,
      description: meta.description,
      content,
      content_hash: indexed?.content_hash || "",
      tags: JSON.stringify(meta.tags),
      domain: meta.domain,
      language: meta.language,
      framework: meta.framework,
      contributor_address: indexed?.contributor_address || "",
      quality_score: meta.quality_score,
      purchase_count: meta.purchase_count,
      created_at: meta.created_at,
    };
  }

  async getMeta(id: string): Promise<PlanMeta | null> {
    return this.getOnChainMeta(id);
  }

  async search(options: SearchOptions): Promise<PlanSearchResult[]> {
    return this.indexer.search(options.query, options.tags, options.limit);
  }

  async contentExists(content: string): Promise<boolean> {
    const hashBytes = createHash("sha256").update(content).digest();

    const op = this.contract.call(
      "content_exists",
      xdr.ScVal.scvBytes(hashBytes),
    );

    try {
      const result = await this.simulateQuery(op);
      return result?.b() ?? false;
    } catch {
      return false;
    }
  }

  // === Payment / Purchase Tracking ===

  async recordPurchase(
    planId: string,
    buyerAddress: string,
    amountStroops: number,
    _txHash: string | null,
  ): Promise<Purchase> {
    const buyer = new Address(buyerAddress);
    const planIdBytes = Buffer.from(planId, "hex");

    const op = this.contract.call(
      "purchase_plan",
      buyer.toScVal(),
      xdr.ScVal.scvBytes(planIdBytes),
      nativeToScVal(BigInt(amountStroops), { type: "i128" }),
    );

    await this.submitTransaction(op);

    const contributorShare = Math.floor((amountStroops * 70) / 100);
    const operatorShare = amountStroops - contributorShare;

    return {
      plan_id: planId,
      buyer_address: buyerAddress,
      amount_stroops: amountStroops,
      contributor_share_stroops: contributorShare,
      operator_share_stroops: operatorShare,
      transaction_hash: null,
      created_at: new Date().toISOString(),
    };
  }

  async getContributorStats(address: string): Promise<ContributorStats> {
    const addr = new Address(address);

    const op = this.contract.call(
      "get_contributor_plans",
      addr.toScVal(),
    );

    try {
      const result = await this.simulateQuery(op);
      const planIds = result?.vec() || [];

      return {
        contributor_address: address,
        plans_count: planIds.length,
        total_earned_stroops: 0,
        total_purchases: 0,
      };
    } catch {
      return {
        contributor_address: address,
        plans_count: 0,
        total_earned_stroops: 0,
        total_purchases: 0,
      };
    }
  }

  async getKBStats(): Promise<KBStats> {
    const indexerStats = this.indexer.getStats();

    return {
      total_plans: indexerStats.total_plans,
      total_purchases: indexerStats.total_purchases,
      total_contributors: 0,
      top_tags: [],
    };
  }

  // === On-Chain Oracle (Soroban) ===

  async publishToChain(
    _planId: string,
  ): Promise<{ txHash: string; contractId: string }> {
    // Already on-chain in Soroban mode
    return {
      txHash: "already-on-chain",
      contractId: this.contract.contractId(),
    };
  }

  async verifyIntegrity(
    planId: string,
  ): Promise<{ verified: boolean; onChainHash: string; localHash: string }> {
    const planMeta = await this.queryPlan(planId);
    if (!planMeta) {
      return { verified: false, onChainHash: "", localHash: "" };
    }

    const onChainHash = planMeta.contentHash;

    // Get content from IPFS and compute local hash
    let localHash = "";
    try {
      if (planMeta.ipfsCid) {
        const content = await this.ipfsClient.get(planMeta.ipfsCid);
        localHash = createHash("sha256").update(content).digest("hex");
      }
    } catch {
      // Cannot verify
    }

    return {
      verified: onChainHash === localHash && localHash !== "",
      onChainHash,
      localHash,
    };
  }

  async syncFromChain(_contractId: string): Promise<Plan[]> {
    // Trigger indexer to re-process events
    await this.indexer.processEvents();
    return [];
  }

  async getOnChainMeta(planId: string): Promise<PlanMeta | null> {
    const planMeta = await this.queryPlan(planId);
    if (!planMeta) return null;

    return {
      id: planId,
      title: planMeta.title,
      description: planMeta.description,
      tags: planMeta.tags,
      domain: planMeta.domain,
      language: planMeta.language,
      framework: planMeta.framework,
      quality_score: planMeta.qualityScore,
      purchase_count: planMeta.purchaseCount,
      created_at: new Date(planMeta.createdAt * 1000).toISOString(),
    };
  }

  // === Content Addressing ===

  async getContentHash(planId: string): Promise<string> {
    const planMeta = await this.queryPlan(planId);
    if (!planMeta) throw new Error(`Plan not found: ${planId}`);
    return planMeta.contentHash;
  }

  // === Lifecycle ===

  async close(): Promise<void> {
    this.indexer.stop();
  }

  // === Private Helpers ===

  private async queryPlan(planId: string): Promise<{
    title: string;
    description: string;
    contentHash: string;
    ipfsCid: string;
    tags: string[];
    domain: string | null;
    language: string | null;
    framework: string | null;
    qualityScore: number;
    purchaseCount: number;
    createdAt: number;
  } | null> {
    const planIdBytes = Buffer.from(planId, "hex");

    const op = this.contract.call(
      "get_plan",
      xdr.ScVal.scvBytes(planIdBytes),
    );

    try {
      const result = await this.simulateQuery(op);
      if (!result || result.switch().name === "scvVoid") return null;

      // Decode the Option<PlanMeta> -> PlanMeta struct
      const optVec = result.vec();
      if (!optVec || optVec.length === 0) return null;

      const planVal = optVec[0];
      const fields = planVal.map()!;

      const getString = (key: string): string => {
        const entry = fields.find(
          (f: xdr.ScMapEntry) => f.key().sym()?.toString() === key,
        );
        return entry?.val().str()?.toString() || "";
      };

      const getU32 = (key: string): number => {
        const entry = fields.find(
          (f: xdr.ScMapEntry) => f.key().sym()?.toString() === key,
        );
        return entry?.val().u32() || 0;
      };

      const getU64 = (key: string): number => {
        const entry = fields.find(
          (f: xdr.ScMapEntry) => f.key().sym()?.toString() === key,
        );
        const val = entry?.val().u64();
        return val ? Number(val.low) : 0;
      };

      const getBytes = (key: string): string => {
        const entry = fields.find(
          (f: xdr.ScMapEntry) => f.key().sym()?.toString() === key,
        );
        const bytes = entry?.val().bytes();
        return bytes ? Buffer.from(bytes).toString("hex") : "";
      };

      const getStringArray = (key: string): string[] => {
        const entry = fields.find(
          (f: xdr.ScMapEntry) => f.key().sym()?.toString() === key,
        );
        const vec = entry?.val().vec();
        return vec?.map((v: xdr.ScVal) => v.str()?.toString() || "") || [];
      };

      return {
        title: getString("title"),
        description: getString("description"),
        contentHash: getBytes("content_hash"),
        ipfsCid: getString("ipfs_cid"),
        tags: getStringArray("tags"),
        domain: getString("domain") || null,
        language: getString("language") || null,
        framework: getString("framework") || null,
        qualityScore: getU32("quality_score"),
        purchaseCount: getU32("purchase_count"),
        createdAt: getU64("created_at"),
      };
    } catch {
      return null;
    }
  }

  private async simulateQuery(
    op: xdr.Operation,
  ): Promise<xdr.ScVal | null> {
    const account = await this.rpcServer.getAccount(
      this.keypair.publicKey(),
    );

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const simResult = await this.rpcServer.simulateTransaction(tx);

    if (
      SorobanRpc.Api.isSimulationSuccess(simResult) &&
      simResult.result
    ) {
      return simResult.result.retval;
    }

    return null;
  }

  private async submitTransaction(op: xdr.Operation): Promise<string> {
    const account = await this.rpcServer.getAccount(
      this.keypair.publicKey(),
    );

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const simResult = await this.rpcServer.simulateTransaction(tx);

    if (!SorobanRpc.Api.isSimulationSuccess(simResult)) {
      throw new Error(
        `Simulation failed: ${JSON.stringify(simResult)}`,
      );
    }

    const assembled = SorobanRpc.assembleTransaction(
      tx,
      simResult,
    ).build();

    assembled.sign(this.keypair);

    const sendResult = await this.rpcServer.sendTransaction(assembled);

    if (sendResult.status === "ERROR") {
      throw new Error(
        `Transaction send failed: ${sendResult.errorResult?.toXDR("base64")}`,
      );
    }

    // Poll for result
    const txHash = sendResult.hash;
    let attempts = 0;

    while (attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      try {
        const getResult = await this.rpcServer.getTransaction(txHash);
        if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          return txHash;
        }
        if (getResult.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
          throw new Error(`Transaction failed: ${getResult.status}`);
        }
      } catch (pollError: unknown) {
        // SDK v13 has an XDR parsing bug ("Bad union switch") when parsing
        // getTransaction responses. The transaction may have succeeded on-chain.
        // If we get an XDR parse error after the tx was accepted, treat as success.
        const msg = pollError instanceof Error ? pollError.message : String(pollError);
        if (msg.includes("Bad union switch")) {
          return txHash;
        }
        throw pollError;
      }
    }

    throw new Error(`Transaction timed out after ${attempts} attempts`);
  }
}
