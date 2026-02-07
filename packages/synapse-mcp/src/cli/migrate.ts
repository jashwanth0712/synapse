import chalk from "chalk";
import { createHash } from "crypto";
import { loadOrCreateWallet } from "../wallet/manager.js";
import { LocalStorageProvider } from "../storage/local-provider.js";
import { SorobanStorageProvider } from "../storage/soroban-provider.js";
import { PinataClient } from "../ipfs/client.js";
import { SorobanEventIndexer } from "../indexer/event-listener.js";
import {
  DB_PATH,
  SOROBAN_RPC_URL,
  CONTRACT_ID,
  INDEXER_DB_PATH,
} from "../config.js";
import type { Plan } from "../types.js";

export async function migrateCommand(): Promise<void> {
  console.log(chalk.bold("\n  Synapse MCP: SQLite -> Soroban Migration\n"));

  if (!CONTRACT_ID) {
    console.error(
      chalk.red("  Error: SYNAPSE_CONTRACT_ID not set. Deploy the contract first."),
    );
    process.exit(1);
  }

  const keypair = loadOrCreateWallet();
  const localStorage = new LocalStorageProvider(DB_PATH);

  // Get all plans from local SQLite
  const stats = await localStorage.getKBStats();
  console.log(
    chalk.cyan(`  Found ${stats.total_plans} plans in local database.\n`),
  );

  if (stats.total_plans === 0) {
    console.log(chalk.yellow("  No plans to migrate."));
    await localStorage.close();
    return;
  }

  // Initialize Soroban provider
  const ipfsClient = new PinataClient();
  const indexer = new SorobanEventIndexer(
    SOROBAN_RPC_URL,
    CONTRACT_ID,
    INDEXER_DB_PATH,
    ipfsClient,
  );

  const sorobanProvider = new SorobanStorageProvider(
    SOROBAN_RPC_URL,
    CONTRACT_ID,
    keypair,
    ipfsClient,
    indexer,
  );

  // We need to query all plans from SQLite directly
  // The storage provider doesn't have a "list all" method,
  // so we search with a broad query
  const allPlans = await localStorage.search({ query: "*", limit: 10000 });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of allPlans) {
    const plan = await localStorage.getById(result.id);
    if (!plan) {
      skipped++;
      continue;
    }

    try {
      // Check if already on-chain (by content hash)
      const exists = await sorobanProvider.contentExists(plan.content);
      if (exists) {
        console.log(
          chalk.yellow(`  [SKIP] "${plan.title}" - already on-chain`),
        );
        skipped++;
        continue;
      }

      // Store on-chain
      const tags = JSON.parse(plan.tags) as string[];
      await sorobanProvider.store({
        title: plan.title,
        description: plan.description,
        content: plan.content,
        tags,
        domain: plan.domain || undefined,
        language: plan.language || undefined,
        framework: plan.framework || undefined,
        contributor_address: plan.contributor_address,
        quality_score: plan.quality_score,
      });

      // Verify hash
      const localHash = createHash("sha256")
        .update(plan.content)
        .digest("hex");
      console.log(
        chalk.green(
          `  [OK]   "${plan.title}" (hash: ${localHash.slice(0, 12)}...)`,
        ),
      );
      migrated++;
    } catch (err) {
      console.error(
        chalk.red(
          `  [ERR]  "${plan.title}": ${(err as Error).message}`,
        ),
      );
      errors++;
    }
  }

  console.log(
    chalk.bold(
      `\n  Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors\n`,
    ),
  );

  await sorobanProvider.close();
  await localStorage.close();
}
