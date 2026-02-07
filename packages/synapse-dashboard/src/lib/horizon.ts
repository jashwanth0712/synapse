import { config } from "./config";

interface HorizonAccount {
  balances: Array<{
    asset_type: string;
    balance: string;
  }>;
}

export async function getAccountBalance(address: string): Promise<string | null> {
  try {
    const res = await fetch(`${config.horizonUrl}/accounts/${address}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as HorizonAccount;
    const native = data.balances.find((b) => b.asset_type === "native");
    return native?.balance ?? null;
  } catch {
    return null;
  }
}
