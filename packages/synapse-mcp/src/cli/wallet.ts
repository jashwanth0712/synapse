import chalk from "chalk";
import { getWalletInfo, getBalance } from "../wallet/manager.js";
import { WALLET_PATH } from "../config.js";

export async function walletCommand(): Promise<void> {
  const info = getWalletInfo();

  if (!info.secretPresent) {
    console.log(
      chalk.yellow(
        "No wallet found. Run the MCP server once to auto-generate one.",
      ),
    );
    return;
  }

  console.log(chalk.bold("Synapse Wallet"));
  console.log(`  Address: ${chalk.cyan(info.publicKey)}`);
  console.log(
    `  Source:  ${info.source === "env" ? "STELLAR_SECRET_KEY env var" : WALLET_PATH}`,
  );
  console.log(`  Network: stellar-testnet`);

  try {
    const balance = await getBalance(info.publicKey);
    console.log(`  Balance: ${chalk.green(balance)}`);
  } catch {
    console.log(`  Balance: ${chalk.red("unable to fetch")}`);
  }
}
