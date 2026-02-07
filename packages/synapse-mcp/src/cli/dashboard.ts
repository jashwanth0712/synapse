import chalk from "chalk";
import { getWalletInfo, getBalance } from "../wallet/manager.js";
import { getHistory } from "../history/tracker.js";
import { LocalStorageProvider } from "../storage/local-provider.js";
import { DB_PATH } from "../config.js";

export async function dashboardCommand(): Promise<void> {
  const info = getWalletInfo();
  const history = getHistory();

  console.log(
    chalk.bold.cyan(`
  ╔═══════════════════════════════════════╗
  ║         SYNAPSE MCP Dashboard         ║
  ║    AI Knowledge Oracle on Stellar     ║
  ╚═══════════════════════════════════════╝
`),
  );

  // Wallet section
  console.log(chalk.bold("  WALLET"));
  if (info.secretPresent) {
    console.log(`  Address:  ${chalk.cyan(info.publicKey)}`);
    console.log(
      `  Source:   ${info.source === "env" ? "env var" : "wallet.json"}`,
    );
    try {
      const balance = await getBalance(info.publicKey);
      console.log(`  Balance:  ${chalk.green(balance)}`);
    } catch {
      console.log(`  Balance:  ${chalk.red("unavailable")}`);
    }
  } else {
    console.log(
      chalk.yellow(
        "  No wallet configured. Run MCP server to auto-generate.",
      ),
    );
  }

  // Usage section
  console.log("");
  console.log(chalk.bold("  USAGE"));
  const searches = history.filter((h) => h.action === "search").length;
  const recalls = history.filter((h) => h.action === "recall").length;
  const learns = history.filter((h) => h.action === "learn").length;
  console.log(`  Searches:    ${searches}`);
  console.log(`  Recalls:     ${recalls}`);
  console.log(`  Learns:      ${learns}`);
  console.log(
    `  Spent:       ~${(searches * 0.2 + recalls * 1).toFixed(1)} XLM`,
  );

  // KB Stats
  try {
    const storage = new LocalStorageProvider(DB_PATH);
    const stats = await storage.getKBStats();
    console.log("");
    console.log(chalk.bold("  KNOWLEDGE BASE"));
    console.log(`  Plans:        ${stats.total_plans}`);
    console.log(`  Purchases:    ${stats.total_purchases}`);
    console.log(`  Contributors: ${stats.total_contributors}`);
    if (stats.top_tags.length > 0) {
      console.log(
        `  Top Tags:     ${stats.top_tags.map((t) => t.tag).join(", ")}`,
      );
    }

    // Contributor stats
    if (info.secretPresent) {
      const cStats = await storage.getContributorStats(info.publicKey);
      if (cStats.plans_count > 0) {
        console.log("");
        console.log(chalk.bold("  CONTRIBUTIONS"));
        console.log(`  Plans:     ${cStats.plans_count}`);
        console.log(`  Purchases: ${cStats.total_purchases}`);
        console.log(
          `  Earned:    ${chalk.green((cStats.total_earned_stroops / 10_000_000).toFixed(2) + " XLM")}`,
        );
      }
    }

    await storage.close();
  } catch {
    // DB may not exist yet
  }

  // Recent activity
  if (history.length > 0) {
    console.log("");
    console.log(chalk.bold("  RECENT ACTIVITY"));
    const recent = history.slice(-5).reverse();
    for (const entry of recent) {
      const time = new Date(entry.timestamp).toLocaleString();
      const desc =
        entry.action === "search"
          ? `search: "${entry.query}"`
          : entry.action === "recall"
            ? `recall: ${entry.planId}`
            : `learn: ${entry.planId}`;
      console.log(`  ${chalk.dim(time)}  ${desc}`);
    }
  }

  console.log("");
}
