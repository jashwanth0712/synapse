import * as StellarSdk from "@stellar/stellar-sdk";
const { Keypair } = StellarSdk;
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { WALLET_PATH, CONFIG_DIR } from "../config.js";

interface WalletFile {
  publicKey: string;
  secretKey: string;
  network: string;
  createdAt: string;
}

export function loadOrCreateWallet(): Keypair {
  const envSecret = process.env.STELLAR_SECRET_KEY;
  if (envSecret) {
    return Keypair.fromSecret(envSecret);
  }

  if (existsSync(WALLET_PATH)) {
    const data = JSON.parse(
      readFileSync(WALLET_PATH, "utf-8"),
    ) as WalletFile;
    return Keypair.fromSecret(data.secretKey);
  }

  mkdirSync(CONFIG_DIR, { recursive: true });
  const keypair = Keypair.random();
  const walletData: WalletFile = {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    network: "stellar-testnet",
    createdAt: new Date().toISOString(),
  };
  writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2), {
    mode: 0o600,
  });

  return keypair;
}

export async function fundWithFriendbot(
  publicKey: string,
): Promise<boolean> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  return res.ok;
}

export async function getBalance(publicKey: string): Promise<string> {
  const url = `https://horizon-testnet.stellar.org/accounts/${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return "0 (account not funded)";
    return "unknown";
  }
  const data = (await res.json()) as {
    balances: Array<{ asset_type: string; balance: string }>;
  };
  const native = data.balances.find((b) => b.asset_type === "native");
  return native ? `${native.balance} XLM` : "0 XLM";
}

export function getWalletInfo(): {
  publicKey: string;
  secretPresent: boolean;
  source: string;
} {
  const envSecret = process.env.STELLAR_SECRET_KEY;
  if (envSecret) {
    const kp = Keypair.fromSecret(envSecret);
    return { publicKey: kp.publicKey(), secretPresent: true, source: "env" };
  }

  if (existsSync(WALLET_PATH)) {
    mkdirSync(dirname(WALLET_PATH), { recursive: true });
    const data = JSON.parse(
      readFileSync(WALLET_PATH, "utf-8"),
    ) as WalletFile;
    return {
      publicKey: data.publicKey,
      secretPresent: true,
      source: "file",
    };
  }

  return { publicKey: "", secretPresent: false, source: "none" };
}
