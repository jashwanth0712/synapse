import chalk from "chalk";
import { getHistory } from "../history/tracker.js";
import { getWalletInfo } from "../wallet/manager.js";
import { LocalStorageProvider } from "../storage/local-provider.js";
import { DB_PATH } from "../config.js";

export async function statsCommand(): Promise<void> {
  const history = getHistory();
  const info = getWalletInfo();

  console.log(chalk.bold("Synapse Usage Statistics"));
  console.log(
    `  Searches:    ${history.filter((h) => h.action === "search").length}`,
  );
  console.log(
    `  Recalls:     ${history.filter((h) => h.action === "recall").length}`,
  );
  console.log(
    `  Learns:      ${history.filter((h) => h.action === "learn").length}`,
  );
  console.log(`  Total:       ${history.length}`);

  try {
    const storage = new LocalStorageProvider(DB_PATH);
    const kbStats = await storage.getKBStats();

    console.log("");
    console.log(chalk.bold("Knowledge Base"));
    console.log(`  Total plans:        ${kbStats.total_plans}`);
    console.log(`  Total purchases:    ${kbStats.total_purchases}`);
    console.log(`  Total contributors: ${kbStats.total_contributors}`);

    if (info.secretPresent) {
      const cStats = await storage.getContributorStats(info.publicKey);
      console.log("");
      console.log(chalk.bold("Your Contributions"));
      console.log(`  Plans uploaded:   ${cStats.plans_count}`);
      console.log(`  Total purchases:  ${cStats.total_purchases}`);
      console.log(
        `  Earnings:         ${(cStats.total_earned_stroops / 10_000_000).toFixed(2)} XLM`,
      );
    }

    await storage.close();
  } catch {
    console.log(
      chalk.dim("\n  No local database found yet. Use synapse_learn to add plans."),
    );
  }
}
