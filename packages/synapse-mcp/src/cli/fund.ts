import chalk from "chalk";
import {
  loadOrCreateWallet,
  fundWithFriendbot,
  getBalance,
} from "../wallet/manager.js";

export async function fundCommand(): Promise<void> {
  const keypair = loadOrCreateWallet();
  const publicKey = keypair.publicKey();

  console.log(chalk.bold("Funding wallet via Friendbot (testnet)..."));
  console.log(`  Address: ${chalk.cyan(publicKey)}`);

  const success = await fundWithFriendbot(publicKey);

  if (success) {
    const balance = await getBalance(publicKey);
    console.log(chalk.green(`  Funded! Balance: ${balance}`));
  } else {
    console.log(
      chalk.yellow(
        "  Friendbot returned an error (wallet may already be funded).",
      ),
    );
    try {
      const balance = await getBalance(publicKey);
      console.log(`  Current balance: ${balance}`);
    } catch {
      // ignore
    }
  }
}
